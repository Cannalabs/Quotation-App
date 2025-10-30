from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db import get_session
from models import AppConfig
from schemas import AppConfigRead, AppConfigUpdate
from config import settings
from typing import Dict, Any
import json

router = APIRouter(prefix="/api/config", tags=["Configuration"])

@router.get("", response_model=AppConfigRead)
async def get_app_config(session: AsyncSession = Depends(get_session)):
    """Get current application configuration"""
    result = await session.execute(select(AppConfig).limit(1))
    config = result.scalars().first()
    
    if not config:
        # Create default config if none exists
        config = AppConfig(
            company_defaults=json.dumps({
                "company_name": settings.default_company_name,
                "default_vat_rate": settings.default_vat_rate
            }),
            quotation_settings=json.dumps({
                "prefix": settings.quotation_prefix,
                "number_format": settings.quotation_number_format
            }),
            timeout_settings=json.dumps({
                "default_timeout": settings.default_timeout,
                "upload_timeout": settings.upload_timeout,
                "toast_timeout": settings.toast_timeout
            }),
            file_settings=json.dumps({
                "max_file_size_mb": settings.max_file_size_mb
            }),
            quote_settings=json.dumps({
                "default_validity_days": settings.default_quote_validity_days
            }),
            ui_settings=json.dumps({
                "currency_symbol": "€",
                "currency_decimal_places": 2,
                "date_format": "MMM dd, yyyy",
                "api_date_format": "yyyy-MM-dd",
                "pagination_page_size": 50
            }),
            validation_patterns=json.dumps({
                "email": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
                "phone": "^[\\+]?[1-9][\\d]{0,15}$",
                "vat": "^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]{3})?$"
            })
        )
        session.add(config)
        await session.commit()
        await session.refresh(config)
    
    return config

@router.put("", response_model=AppConfigRead)
async def update_app_config(payload: AppConfigUpdate, session: AsyncSession = Depends(get_session)):
    """Update application configuration"""
    result = await session.execute(select(AppConfig).limit(1))
    config = result.scalars().first()
    
    if not config:
        config = AppConfig()
        session.add(config)
        await session.flush()
    
    # Update configuration sections
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(config, field, json.dumps(value) if isinstance(value, dict) else value)
    
    await session.commit()
    await session.refresh(config)
    return config

@router.post("/reset", response_model=AppConfigRead)
async def reset_app_config(session: AsyncSession = Depends(get_session)):
    """Reset configuration to defaults"""
    result = await session.execute(select(AppConfig).limit(1))
    config = result.scalars().first()
    
    if config:
        await session.delete(config)
        await session.commit()
    
    # Return default configuration
    return await get_app_config(session)

@router.get("/export")
async def export_config(session: AsyncSession = Depends(get_session)):
    """Export current configuration as JSON"""
    result = await session.execute(select(AppConfig).limit(1))
    config = result.scalars().first()
    
    if not config:
        return {"message": "No configuration found"}
    
    config_data = {
        "company_defaults": json.loads(config.company_defaults) if config.company_defaults else {},
        "quotation_settings": json.loads(config.quotation_settings) if config.quotation_settings else {},
        "timeout_settings": json.loads(config.timeout_settings) if config.timeout_settings else {},
        "file_settings": json.loads(config.file_settings) if config.file_settings else {},
        "quote_settings": json.loads(config.quote_settings) if config.quote_settings else {},
        "ui_settings": json.loads(config.ui_settings) if config.ui_settings else {},
        "validation_patterns": json.loads(config.validation_patterns) if config.validation_patterns else {}
    }
    
    return config_data

@router.post("/import")
async def import_config(config_data: Dict[str, Any], session: AsyncSession = Depends(get_session)):
    """Import configuration from JSON"""
    result = await session.execute(select(AppConfig).limit(1))
    config = result.scalars().first()
    
    if not config:
        config = AppConfig()
        session.add(config)
        await session.flush()
    
    # Update configuration with imported data
    for section, data in config_data.items():
        if hasattr(config, section) and isinstance(data, dict):
            setattr(config, section, json.dumps(data))
    
    await session.commit()
    await session.refresh(config)
    return config
