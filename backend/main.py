from fastapi import FastAPI, Response, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from jinja2 import Template
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError, DatabaseError, SQLAlchemyError
from config import settings
from db import engine
from models import Base
from routers import company_settings as company_settings_router
from routers import customers as customers_router
from routers import products as products_router
from routers import quotes as quotes_router
from routers import users as users_router
from routers import countries as countries_router
from routers import email as email_router
from email_service import email_service
from migrations import migrate_database
from exception_handlers import (
    validation_exception_handler,
    database_exception_handler,
    http_exception_handler,
    general_exception_handler
)
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Local Test API", version="0.1.0")

def is_browser_request(request: Request) -> bool:
    """Check if request is from a browser (not API client)"""
    accept = request.headers.get("Accept", "")
    # Browser requests typically accept text/html
    # API clients typically accept application/json
    return "text/html" in accept or ("*/*" in accept and "application/json" not in accept)

def load_error_template() -> str:
    """Load the error.html template"""
    from pathlib import Path
    # Get the directory where main.py is located
    backend_dir = Path(__file__).parent
    template_path = backend_dir / "templates" / "error.html"
    with open(template_path, "r", encoding="utf-8") as f:
        return f.read()

# CORS from config - Allow specific origins for network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,  # Can be True with specific origins
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    # Log JWT configuration status (without exposing the actual key)
    jwt_key_set = settings.jwt_secret_key and settings.jwt_secret_key != "your-secret-key-change-in-production"
    logger.info(f"JWT Authentication: {'Configured' if jwt_key_set else 'Using default key (INSECURE - change in .env.conf)'}")
    if jwt_key_set:
        logger.info(f"JWT Secret Key: {'*' * 20}... (length: {len(settings.jwt_secret_key)})")
    else:
        logger.warning("JWT Secret Key is using default value. Set jwt_secret_key in .env.conf for production!")
    
    # Run database migrations to add any missing columns
    try:
        await migrate_database(engine)
    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        # Continue anyway - tables might already exist
    
    # Then reload email settings from database after database is ready
    # This ensures email service uses database settings instead of .env.conf
    try:
        await email_service.reinitialize_async()
        if email_service.is_configured:
            logger.info("Email service loaded from database on server startup")
        else:
            logger.info("Email service not configured - no settings found in database")
    except Exception as e:
        logger.warning(f"Could not load email settings from database on startup: {e}. Email service may use .env.conf fallback.")

# Root-level test routes
@app.get("/")
def root():
    return {"status": "ok", "message": "FastAPI root at /"}

@app.get("/hello")
def hello_root(name: str = "world"):
    return {"message": f"Hello, {name}!"}

@app.get("/items/{item_id}")
def read_item_root(item_id: int, q: str | None = None):
    return {"item_id": item_id, "query": q}

# API test routes
@app.get("/api/")
def read_root():
    return {"status": "ok", "message": "FastAPI is running - UPDATED from server!"}

@app.get("/api/hello")
def hello(name: str = "world"):
    return {"message": f"Hello, {name}!"}

@app.get("/api/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "query": q}

# Company settings router (Postgres-backed)
app.include_router(company_settings_router.router)
app.include_router(customers_router.router)
app.include_router(products_router.router)
app.include_router(quotes_router.router)
app.include_router(users_router.router)
app.include_router(countries_router.router)
app.include_router(email_router.router)

# Register centralized exception handlers
# Order matters: more specific handlers should be registered first
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, database_exception_handler)
app.add_exception_handler(DatabaseError, database_exception_handler)
app.add_exception_handler(SQLAlchemyError, database_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Custom exception handler for HTML error pages (browser requests)
# This handles HTTP exceptions and returns HTML for browsers, JSON for API clients
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler_html(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions - return HTML for browsers, JSON for API clients"""
    # Check if request is from browser
    if is_browser_request(request) and exc.status_code in [401, 403, 404]:
        # Determine error details
        if exc.status_code == 401:
            icon = "🔒"
            title = "Unauthorized"
            message = "You need to authenticate to access this resource."
            detail = exc.detail if isinstance(exc.detail, str) else "Authentication required"
        elif exc.status_code == 403:
            icon = "🚫"
            title = "Forbidden"
            message = "You don't have permission to access this resource."
            detail = exc.detail if isinstance(exc.detail, str) else "Access denied"
        else:  # 404
            icon = "🔍"
            title = "Not Found"
            message = "The requested resource could not be found."
            detail = exc.detail if isinstance(exc.detail, str) else "Resource not found"
        
        # Get frontend URL from request referer or origin
        frontend_url = None
        referer = request.headers.get("Referer") or request.headers.get("Referrer")
        if referer:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                frontend_url = f"{parsed.scheme}://{parsed.netloc}"
            except:
                pass
        
        # If no referer, try to infer from origin (for production)
        if not frontend_url:
            origin = request.headers.get("Origin")
            if origin:
                frontend_url = origin
            else:
                # Default: assume frontend on same origin (production) or port 5173 (dev)
                scheme = request.url.scheme
                host = request.url.hostname
                if request.url.port == 8000:
                    # Dev mode: backend on 8000, frontend likely on 5173
                    frontend_url = f"{scheme}://{host}:5173"
                else:
                    # Production: same origin
                    frontend_url = f"{scheme}://{host}"
        
        # Load and render HTML template
        template_content = load_error_template()
        template = Template(template_content)
        html_content = template.render(
            status_code=exc.status_code,
            icon=icon,
            title=title,
            message=message,
            detail=detail,
            frontend_url=frontend_url
        )
        
        return HTMLResponse(content=html_content, status_code=exc.status_code)
    
    # For API clients, let the centralized handler deal with it
    # We'll call the JSON handler
    return await http_exception_handler(request, exc)

# Silence favicon 404s
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)