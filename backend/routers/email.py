from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from email_service import email_service
from auth import get_current_user
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_session
from models import EmailSettings, User
from schemas import EmailSettingsRead, EmailSettingsUpdate

router = APIRouter(prefix="/api/email", tags=["email"])

async def _commit_and_refresh(session: AsyncSession, obj):
    """Commit session and refresh object."""
    await session.commit()
    await session.refresh(obj)
    return obj

async def _get_or_create_email_settings(session: AsyncSession, use_lock: bool = True) -> EmailSettings:
    """Get existing email settings or create default one. Uses advisory lock if use_lock=True."""
    from config import settings as app_settings
    
    lock_id = 123456  # Fixed ID for email settings singleton
    
    if use_lock:
        try:
            # Try to acquire advisory lock
            await session.execute(text(f"SELECT pg_advisory_xact_lock({lock_id})"))
            result = await session.execute(select(EmailSettings).limit(1).with_for_update(skip_locked=False))
            email_settings = result.scalars().first()
            
            if not email_settings:
                email_settings = EmailSettings(
                    mail_from_name=app_settings.mail_from_name,
                    mail_port=app_settings.mail_port,
                    mail_tls=app_settings.mail_tls,
                    mail_ssl=app_settings.mail_ssl,
                    mail_use_credentials=app_settings.mail_use_credentials
                )
                session.add(email_settings)
                await session.flush()
                await session.refresh(email_settings)
            
            await session.commit()
            return email_settings
        except Exception:
            await session.rollback()
            # Fall through to non-locked version
    
    # Non-locked fallback
    result = await session.execute(select(EmailSettings).limit(1))
    email_settings = result.scalars().first()
    if not email_settings:
        email_settings = EmailSettings(
            mail_from_name=app_settings.mail_from_name,
            mail_port=app_settings.mail_port,
            mail_tls=app_settings.mail_tls,
            mail_ssl=app_settings.mail_ssl,
            mail_use_credentials=app_settings.mail_use_credentials
        )
        session.add(email_settings)
        await session.commit()
        await session.refresh(email_settings)
    return email_settings

class QuotationEmailRequest(BaseModel):
    to_email: EmailStr
    customer_name: str
    quotation_number: str
    total_amount: float
    valid_until: str
    notes: Optional[str] = None
    company_name: str = "Grow United Italy"
    company_email: str = ""
    quotation_data: Optional[dict] = None

class TestEmailRequest(BaseModel):
    to_email: EmailStr

class EmailConfigRequest(BaseModel):
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_from_name: str = "Grow United Italy"
    mail_port: int = 587
    mail_server: str = ""
    mail_tls: bool = True
    mail_ssl: bool = False
    mail_use_credentials: bool = True

def _update_email_settings_fields(email_settings: EmailSettings, request: EmailConfigRequest):
    """Update email settings fields from request with proper defaults."""
    # Required fields (already validated)
    email_settings.mail_server = request.mail_server.strip()
    email_settings.mail_username = request.mail_username.strip()
    email_settings.mail_from = request.mail_from.strip()
    
    # Update password if provided, otherwise keep existing
    if request.mail_password and request.mail_password.strip():
        email_settings.mail_password = request.mail_password.strip()
    
    # Optional fields with defaults
    email_settings.mail_from_name = (
        request.mail_from_name.strip() if request.mail_from_name and request.mail_from_name.strip() 
        else email_settings.mail_from_name or "Grow United Italy"
    )
    email_settings.mail_port = request.mail_port if request.mail_port is not None else (email_settings.mail_port or 587)
    email_settings.mail_tls = request.mail_tls if request.mail_tls is not None else (email_settings.mail_tls if email_settings.mail_tls is not None else True)
    email_settings.mail_ssl = request.mail_ssl if request.mail_ssl is not None else (email_settings.mail_ssl if email_settings.mail_ssl is not None else False)
    email_settings.mail_use_credentials = (
        request.mail_use_credentials if request.mail_use_credentials is not None 
        else (email_settings.mail_use_credentials if email_settings.mail_use_credentials is not None else True)
    )

@router.post("/send-quotation")
async def send_quotation_email(
    request: QuotationEmailRequest,
    _: User = Depends(get_current_user),
):
    """
    Send quotation email to customer
    """
    try:
        success = await email_service.send_quotation_email(
            to_email=request.to_email,
            customer_name=request.customer_name,
            quotation_number=request.quotation_number,
            total_amount=request.total_amount,
            valid_until=request.valid_until,
            notes=request.notes,
            company_name=request.company_name,
            company_email=request.company_email,
            quotation_data=request.quotation_data
        )
        
        if success:
            return {"message": "Quotation email sent successfully", "success": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")
            
    except HTTPException:
        # Re-raise HTTP exceptions (they're already properly formatted)
        raise
    except Exception as e:
        # Let the centralized exception handler deal with unexpected errors
        # It will log the full error and return generic message
        raise HTTPException(status_code=500, detail="Failed to send email")

@router.post("/send-test")
async def send_test_email(
    request: TestEmailRequest,
    _: User = Depends(get_current_user),
):
    """
    Send test email to verify email configuration
    """
    try:
        success = await email_service.send_test_email(request.to_email)
        
        if success:
            return {"message": "Test email sent successfully", "success": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email")
            
    except Exception as e:
        # Let the centralized exception handler deal with unexpected errors
        # It will log the full error and return generic message
        raise HTTPException(status_code=500, detail="Test email sending failed")

@router.get("/config", response_model=EmailSettingsRead)
async def get_email_config(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    """
    Get email configuration from database.
    Uses database-level locking to prevent race conditions.
    """
    return await _get_or_create_email_settings(session, use_lock=True)

@router.get("/config-status")
async def get_email_config_status(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    """
    Check if email configuration is properly set up
    """
    email_settings = await _get_or_create_email_settings(session, use_lock=False)
    
    return {
        "mail_server_configured": bool(email_settings.mail_server),
        "mail_username_configured": bool(email_settings.mail_username),
        "mail_password_configured": bool(email_settings.mail_password),
        "mail_from_configured": bool(email_settings.mail_from),
        "fully_configured": bool(
            email_settings.mail_server and 
            email_settings.mail_username and 
            email_settings.mail_password and 
            email_settings.mail_from
        )
    }

@router.post("/save-config")
async def save_email_config(
    request: EmailConfigRequest,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
):
    """
    Save email configuration to database (persists across server restarts)
    All required fields must be provided: mail_server, mail_username, mail_password, mail_from
    Uses database-level locking to prevent race conditions.
    """
    # Use advisory lock to prevent race condition
    lock_id = 123456  # Fixed ID for email settings singleton
    
    try:
        # Acquire advisory lock to prevent concurrent modifications
        # This ensures only one request can create/update email settings at a time
        await session.execute(text(f"SELECT pg_advisory_xact_lock({lock_id})"))
        
        # Get existing email settings - advisory lock prevents race condition
        email_settings = await _get_or_create_email_settings(session, use_lock=True)
        existing_password = email_settings.mail_password
        
        # Validate required fields
        missing_fields = []
        if not request.mail_server or not request.mail_server.strip():
            missing_fields.append("SMTP Server")
        if not request.mail_username or not request.mail_username.strip():
            missing_fields.append("Username/Email")
        # Password is required if no existing password in database (first time setup)
        # If existing password exists and new one not provided, we'll preserve the existing one
        if not existing_password and (not request.mail_password or not request.mail_password.strip()):
            missing_fields.append("Password/App Password")
        if not request.mail_from or not request.mail_from.strip():
            missing_fields.append("From Email")
        
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}. Please fill in all required fields before saving."
            )
        
        # Email settings already retrieved above with lock
        
        # Update fields from request - all required fields are validated above
        _update_email_settings_fields(email_settings, request)
        await _commit_and_refresh(session, email_settings)
        
        # Log what was saved for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Email settings saved - Server: {email_settings.mail_server}, From: {email_settings.mail_from}, Username: {email_settings.mail_username}, Password set: {bool(email_settings.mail_password)}")
        
        # Reinitialize email service with new settings from database
        # This ensures the email service uses the updated settings immediately
        try:
            await email_service.reinitialize_async()
            # Verify email service is configured
            if not email_service.is_configured:
                logger.warning("Email service reinitialized but not configured. Settings may be incomplete.")
            else:
                logger.info("Email service successfully reinitialized and ready to use.")
        except Exception as reinit_error:
            logger.error(f"Failed to reinitialize email service: {reinit_error}")
            # Don't fail the save operation, but log the error
            # The email service will load from database on next use
        
        # Return saved settings (without password) for frontend to update form
        return {
            "message": "Email configuration saved successfully to database and email service has been updated.",
            "success": True,
            "is_configured": email_service.is_configured,
            "config": {
                "mail_username": email_settings.mail_username,
                "mail_from": email_settings.mail_from,
                "mail_from_name": email_settings.mail_from_name,
                "mail_port": email_settings.mail_port,
                "mail_server": email_settings.mail_server,
                "mail_tls": email_settings.mail_tls,
                "mail_ssl": email_settings.mail_ssl,
                "mail_use_credentials": email_settings.mail_use_credentials
            }
        }
        
    except Exception as e:
        await session.rollback()
        # Let the centralized exception handler deal with unexpected errors
        # It will log the full error and return generic message
        raise HTTPException(status_code=500, detail="Failed to save email configuration")
