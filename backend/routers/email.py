from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from email_service import email_service
from auth import get_current_user_role

router = APIRouter(prefix="/api/email", tags=["email"])

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

@router.post("/send-quotation")
async def send_quotation_email(
    request: QuotationEmailRequest,
    current_role: str = Depends(get_current_user_role)
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
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email sending failed: {str(e)}")

@router.post("/send-test")
async def send_test_email(
    request: TestEmailRequest,
    current_role: str = Depends(get_current_user_role)
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
        raise HTTPException(status_code=500, detail=f"Test email sending failed: {str(e)}")

@router.get("/config-status")
async def get_email_config_status(current_role: str = Depends(get_current_user_role)):
    """
    Check if email configuration is properly set up
    """
    from config import settings
    
    config_status = {
        "mail_server_configured": bool(settings.mail_server),
        "mail_username_configured": bool(settings.mail_username),
        "mail_password_configured": bool(settings.mail_password),
        "mail_from_configured": bool(settings.mail_from),
        "fully_configured": bool(
            settings.mail_server and 
            settings.mail_username and 
            settings.mail_password and 
            settings.mail_from
        )
    }
    
    return config_status

@router.post("/save-config")
async def save_email_config(
    request: EmailConfigRequest,
    current_role: str = Depends(get_current_user_role)
):
    """
    Save email configuration (for session only - requires server restart to take effect)
    """
    try:
        # Update the email service configuration
        from email_service import email_service
        from config import settings
        
        # Update settings (this will only affect the current session)
        settings.mail_username = request.mail_username
        settings.mail_password = request.mail_password
        settings.mail_from = request.mail_from
        settings.mail_from_name = request.mail_from_name
        settings.mail_port = request.mail_port
        settings.mail_server = request.mail_server
        settings.mail_tls = request.mail_tls
        settings.mail_ssl = request.mail_ssl
        settings.mail_use_credentials = request.mail_use_credentials
        
        # Reinitialize email service with new settings
        email_service.reinitialize()
        
        return {
            "message": "Email configuration saved successfully. Server restart required for permanent changes.",
            "success": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save email configuration: {str(e)}")
