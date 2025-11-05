"""
Database migration utilities for automatically adding missing columns on startup.
This ensures that when new columns are added to models, they are automatically
created in the database without requiring manual migrations.
"""
import logging
from sqlalchemy import inspect, text, MetaData, Table
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.engine import Inspector
from typing import List, Set
from models import Base, EmailSettings, CompanySettings, Customer, Product, Quote, QuoteItem, User

logger = logging.getLogger(__name__)


def get_table_columns_sync(inspector: Inspector, table_name: str) -> Set[str]:
    """Get set of existing columns in a table."""
    if not inspector.has_table(table_name):
        return set()
    return {col["name"] for col in inspector.get_columns(table_name)}


def get_model_columns(model_class) -> dict:
    """Get all columns from a model class."""
    mapper = inspect(model_class)
    return {col.key: col for col in mapper.columns}


def generate_add_column_sql(table_name: str, column_name: str, column, dialect) -> str:
    """Generate SQL ALTER TABLE statement to add a column."""
    column_type = column.type.compile(dialect=dialect)
    
    # Build the column definition
    parts = [f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"]
    
    # Handle nullable - PostgreSQL allows NULL by default, but we'll be explicit
    if not column.nullable:
        parts.append("NOT NULL")
    
    # Handle server default
    if column.server_default is not None:
        if hasattr(column.server_default, 'arg'):
            default_expr = str(column.server_default.arg)
            # Handle different default types
            if isinstance(default_expr, str):
                # If it's a boolean string like 'true' or 'false', use as-is
                if default_expr.lower() in ('true', 'false'):
                    parts.append(f"DEFAULT {default_expr}")
                # If it's a quoted string or number, use as-is
                elif default_expr.startswith("'") or default_expr.isdigit():
                    parts.append(f"DEFAULT {default_expr}")
                # If it's a function call like 'now()', keep it as is
                else:
                    parts.append(f"DEFAULT {default_expr}")
            else:
                parts.append(f"DEFAULT {default_expr}")
        else:
            default_expr = str(column.server_default)
            parts.append(f"DEFAULT {default_expr}")
    
    # For nullable columns without defaults, PostgreSQL allows NULL by default
    # No need to explicitly add "NULL" as it's the default behavior
    
    return " ".join(parts)


async def migrate_database(engine: AsyncEngine):
    """
    Migrate database schema by adding missing columns to existing tables.
    This runs on startup to ensure all model columns exist in the database.
    """
    logger.info("Starting database migration check...")
    
    # Map of table names to model classes
    table_models = {
        "email_settings": EmailSettings,
        "company_settings": CompanySettings,
        "customers": Customer,
        "products": Product,
        "quotes": Quote,
        "quote_items": QuoteItem,
        "users": User,
    }
    
    total_added = 0
    
    # First ensure all tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Check and add missing columns for each table
    # We need to use run_sync to access the inspector since it requires sync operations
    for table_name, model_class in table_models.items():
        async with engine.connect() as conn:
            # Get inspector and check columns in sync context
            def get_existing_columns_and_dialect(sync_conn):
                inspector = inspect(sync_conn)
                existing_columns = get_table_columns_sync(inspector, table_name)
                return existing_columns, sync_conn.dialect
            
            try:
                existing_columns, dialect = await conn.run_sync(get_existing_columns_and_dialect)
                
                if not existing_columns:
                    logger.debug(f"Table '{table_name}' does not exist yet, skipping")
                    continue
                
                model_columns = get_model_columns(model_class)
                added_columns = []
                
                # Log existing columns for debugging
                logger.debug(f"Table '{table_name}' existing columns: {sorted(existing_columns)}")
                logger.debug(f"Table '{table_name}' model columns: {sorted(model_columns.keys())}")
                
                # Add each missing column in its own transaction
                for column_name, column in model_columns.items():
                    if column_name not in existing_columns:
                        try:
                            sql = generate_add_column_sql(table_name, column_name, column, dialect)
                            logger.info(f"Adding column '{column_name}' to table '{table_name}' with SQL: {sql}")
                            # Execute ALTER TABLE in a separate transaction
                            async with engine.begin() as alter_conn:
                                await alter_conn.execute(text(sql))
                            added_columns.append(column_name)
                            logger.info(f"Successfully added column '{column_name}' to table '{table_name}'")
                        except Exception as e:
                            logger.error(f"Failed to add column '{column_name}' to table '{table_name}': {e}", exc_info=True)
                            # Continue with other columns - don't fail entire migration for one column
                
                if added_columns:
                    total_added += len(added_columns)
                    logger.info(f"Added {len(added_columns)} column(s) to '{table_name}': {', '.join(added_columns)}")
                    
            except Exception as e:
                logger.error(f"Error checking/updating table '{table_name}': {e}")
    
    if total_added > 0:
        logger.info(f"Migration complete: Added {total_added} column(s) across all tables")
    else:
        logger.info("Migration check complete: No missing columns found")
    
    # Verify critical columns exist (especially for users table)
    async with engine.connect() as conn:
        def verify_users_table(sync_conn):
            inspector = inspect(sync_conn)
            if inspector.has_table("users"):
                columns = {col["name"] for col in inspector.get_columns("users")}
                critical_columns = ["id", "email", "password_hash", "role", "is_active"]
                missing = [col for col in critical_columns if col not in columns]
                return missing
            return []
        
        missing_critical = await conn.run_sync(verify_users_table)
        if missing_critical:
            logger.warning(f"CRITICAL: Users table is missing columns: {missing_critical}")
        else:
            logger.info("Users table verification: All critical columns present")
    
    return total_added

