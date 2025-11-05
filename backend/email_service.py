from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from typing import List, Optional, Dict, Any
from config import settings
import logging
import tempfile
import os
import json
import requests
import base64
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from io import BytesIO
import pdfkit

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self._initialize_email_service()
    
    def _get_email_config(self):
        """
        Get email configuration from database first, fallback to config file.
        This is a synchronous method that tries to load from database if possible.
        """
        try:
            # Try to load from database using async context
            import asyncio
            from sqlalchemy import select
            from db import AsyncSessionLocal
            from models import EmailSettings
            
            async def _load_from_db():
                async with AsyncSessionLocal() as session:
                    result = await session.execute(select(EmailSettings).limit(1))
                    email_settings = result.scalars().first()
                    if email_settings and email_settings.mail_from and email_settings.mail_server:
                        return {
                            'mail_username': email_settings.mail_username,
                            'mail_password': email_settings.mail_password,
                            'mail_from': email_settings.mail_from,
                            'mail_from_name': email_settings.mail_from_name,
                            'mail_port': email_settings.mail_port,
                            'mail_server': email_settings.mail_server,
                            'mail_tls': email_settings.mail_tls,
                            'mail_ssl': email_settings.mail_ssl,
                            'mail_use_credentials': email_settings.mail_use_credentials
                        }
                    return None
            
            # Try to get existing event loop or create new one
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If loop is running, we can't use it synchronously
                    # Fallback to config file
                    logger.info("Event loop is running, loading email config from file")
                    return None
            except RuntimeError:
                # No event loop, create one
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            db_config = loop.run_until_complete(_load_from_db())
            if db_config:
                logger.info("Loaded email configuration from database")
                return db_config
        except Exception as e:
            logger.warning(f"Could not load email config from database: {e}, falling back to config file")
        
        # Fallback to config file
        if settings.mail_from and settings.mail_server:
            logger.info("Loading email configuration from config file")
            return {
                'mail_username': settings.mail_username,
                'mail_password': settings.mail_password,
                'mail_from': settings.mail_from,
                'mail_from_name': settings.mail_from_name,
                'mail_port': settings.mail_port,
                'mail_server': settings.mail_server,
                'mail_tls': settings.mail_tls,
                'mail_ssl': settings.mail_ssl,
                'mail_use_credentials': settings.mail_use_credentials
            }
        
        return None
    
    def _initialize_email_service(self):
        email_config = self._get_email_config()
        
        if email_config and email_config.get('mail_from') and email_config.get('mail_server'):
            # Fix common SMTP server typos
            mail_server = email_config['mail_server'].lower().strip()
            if 'smpt.gmail.com' in mail_server:
                mail_server = 'smtp.gmail.com'
                logger.warning(f"Fixed SMTP server typo: {email_config['mail_server']} -> {mail_server}")
            elif 'smpt.' in mail_server:
                mail_server = mail_server.replace('smpt.', 'smtp.')
                logger.warning(f"Fixed SMTP server typo: {email_config['mail_server']} -> {mail_server}")
            
            # Debug logging
            logger.info(f"Initializing email service with server: {mail_server}")
            logger.info(f"Email from: {email_config['mail_from']}")
            logger.info(f"Port: {email_config['mail_port']}")
            
            self.config = ConnectionConfig(
                MAIL_USERNAME=email_config['mail_username'],
                MAIL_PASSWORD=email_config['mail_password'],
                MAIL_FROM=email_config['mail_from'],
                MAIL_FROM_NAME=email_config['mail_from_name'],
                MAIL_PORT=email_config['mail_port'],
                MAIL_SERVER=mail_server,
                MAIL_STARTTLS=email_config['mail_tls'],
                MAIL_SSL_TLS=email_config['mail_ssl'],
                USE_CREDENTIALS=email_config['mail_use_credentials'],
                VALIDATE_CERTS=True
            )
            self.fastmail = FastMail(self.config)
            self.is_configured = True
        else:
            logger.info("Email service not configured - missing mail_from or mail_server")
            self.config = None
            self.fastmail = None
            self.is_configured = False
    
    def reinitialize(self):
        """Reinitialize the email service with current settings (synchronous)"""
        self._initialize_email_service()
    
    async def reinitialize_async(self):
        """Reinitialize the email service with current settings from database (async)"""
        try:
            from sqlalchemy import select
            from db import AsyncSessionLocal
            from models import EmailSettings
            
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(EmailSettings).limit(1))
                email_settings = result.scalars().first()
                if email_settings and email_settings.mail_from and email_settings.mail_server:
                    email_config = {
                        'mail_username': email_settings.mail_username,
                        'mail_password': email_settings.mail_password,
                        'mail_from': email_settings.mail_from,
                        'mail_from_name': email_settings.mail_from_name,
                        'mail_port': email_settings.mail_port,
                        'mail_server': email_settings.mail_server,
                        'mail_tls': email_settings.mail_tls,
                        'mail_ssl': email_settings.mail_ssl,
                        'mail_use_credentials': email_settings.mail_use_credentials
                    }
                    
                    # Verify all required fields are present
                    if not email_config.get('mail_username') or not email_config.get('mail_password'):
                        logger.warning("Email settings missing username or password, email service will not be fully configured")
                    
                    # Fix common SMTP server typos
                    mail_server = email_config['mail_server'].lower().strip()
                    if 'smpt.gmail.com' in mail_server:
                        mail_server = 'smtp.gmail.com'
                        logger.warning(f"Fixed SMTP server typo: {email_config['mail_server']} -> {mail_server}")
                    elif 'smpt.' in mail_server:
                        mail_server = mail_server.replace('smpt.', 'smtp.')
                        logger.warning(f"Fixed SMTP server typo: {email_config['mail_server']} -> {mail_server}")
                    
                    logger.info(f"Reinitializing email service with server: {mail_server}, from: {email_config['mail_from']}")
                    
                    self.config = ConnectionConfig(
                        MAIL_USERNAME=email_config['mail_username'],
                        MAIL_PASSWORD=email_config['mail_password'],
                        MAIL_FROM=email_config['mail_from'],
                        MAIL_FROM_NAME=email_config['mail_from_name'],
                        MAIL_PORT=email_config['mail_port'],
                        MAIL_SERVER=mail_server,
                        MAIL_STARTTLS=email_config['mail_tls'],
                        MAIL_SSL_TLS=email_config['mail_ssl'],
                        USE_CREDENTIALS=email_config['mail_use_credentials'],
                        VALIDATE_CERTS=True
                    )
                    self.fastmail = FastMail(self.config)
                    self.is_configured = True
                    logger.info(f"Email service successfully reinitialized - configured: {self.is_configured}, server: {mail_server}")
                    return
                else:
                    logger.warning(f"Email settings not found or incomplete in database - mail_from: {email_settings.mail_from if email_settings else None}, mail_server: {email_settings.mail_server if email_settings else None}")
        except Exception as e:
            logger.error(f"Could not reinitialize from database: {e}", exc_info=True)
        
        # Fallback to synchronous reinitialize
        logger.info("Falling back to synchronous reinitialize")
        self.reinitialize()

    async def send_quotation_email(
        self,
        to_email: str,
        customer_name: str,
        quotation_number: str,
        total_amount: float,
        valid_until: str,
        notes: Optional[str] = None,
        company_name: str = "Grow United Italy",
        company_email: str = "",
        quotation_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Send quotation email to customer
        """
        if not self.is_configured:
            logger.error("Email service is not configured")
            return False
            
        try:
            # Create email subject
            subject = f"Quotation {quotation_number} - {company_name}"
            
            # Extract additional data from quotation_data if available
            company_settings = {}
            quotation_date = ""
            company_phone = ""
            company_website = ""
            
            if quotation_data:
                company_settings = quotation_data.get('company_settings', {})
                quotation_date_raw = quotation_data.get('date', '')
                
                # Format quotation date
                if quotation_date_raw:
                    try:
                        from datetime import datetime
                        if isinstance(quotation_date_raw, str):
                            if 'T' in quotation_date_raw or 'Z' in quotation_date_raw:
                                dt = datetime.fromisoformat(quotation_date_raw.replace('Z', '+00:00'))
                            else:
                                dt = datetime.strptime(quotation_date_raw, '%Y-%m-%d')
                            quotation_date = dt.strftime('%d/%m/%Y')
                        else:
                            quotation_date = str(quotation_date_raw)
                    except Exception:
                        quotation_date = str(quotation_date_raw) if quotation_date_raw else ""
                
                company_phone = company_settings.get('phone', '')
                company_website = company_settings.get('website', '')
            
            # Format valid_until date - ensure full date with year
            valid_until_formatted = valid_until
            try:
                from datetime import datetime
                if isinstance(valid_until, str) and valid_until.strip():
                    # Try ISO format first (with T or Z)
                    if 'T' in valid_until or 'Z' in valid_until:
                        dt = datetime.fromisoformat(valid_until.replace('Z', '+00:00'))
                        valid_until_formatted = dt.strftime('%d/%m/%Y')
                    # Try DD/MM/YYYY format
                    elif valid_until.count('/') == 2:
                        parts = valid_until.split('/')
                        if len(parts) == 3 and len(parts[2]) == 4:  # Has year
                            valid_until_formatted = valid_until  # Already full format
                        elif len(parts) == 3 and len(parts[2]) == 2:  # Has 2-digit year
                            # Convert 2-digit year to 4-digit
                            year = int(parts[2])
                            if year < 50:
                                year = 2000 + year
                            else:
                                year = 1900 + year
                            valid_until_formatted = f"{parts[0]}/{parts[1]}/{year}"
                    # Try DD/MM format - add current year
                    elif valid_until.count('/') == 1:
                        parts = valid_until.split('/')
                        if len(parts) == 2:
                            current_year = datetime.now().year
                            valid_until_formatted = f"{parts[0]}/{parts[1]}/{current_year}"
                    # Try YYYY-MM-DD format
                    elif '-' in valid_until and len(valid_until) >= 10:
                        dt = datetime.strptime(valid_until[:10], '%Y-%m-%d')
                        valid_until_formatted = dt.strftime('%d/%m/%Y')
            except Exception as e:
                logger.warning(f"Failed to format validity date '{valid_until}': {e}")
                # If parsing fails, try to ensure it has a year
                if valid_until and '/' in valid_until and valid_until.count('/') == 1:
                    from datetime import datetime
                    current_year = datetime.now().year
                    valid_until_formatted = f"{valid_until}/{current_year}"
            
            # Format currency symbol (assuming EUR for now)
            currency_symbol = "€"
            
            # Get logo - try assets folder first, then company settings, then placeholder
            # Use CID (Content-ID) for inline attachment for better email client compatibility
            logo_cid = "company-logo"
            logo_url = f"cid:{logo_cid}"  # Use CID reference for inline attachment
            logo_attachment_path = None
            
            # Try to use logo from assets folder
            logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src', 'assets', 'logo.png')
            if os.path.exists(logo_path):
                try:
                    # Copy logo to temp file for inline attachment
                    import shutil
                    logo_temp = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
                    shutil.copy2(logo_path, logo_temp.name)
                    logo_temp.close()
                    logo_attachment_path = logo_temp.name
                    logger.info(f"Using logo from assets folder: {logo_path} (copied to {logo_attachment_path})")
                except Exception as e:
                    logger.warning(f"Failed to copy logo from assets folder: {e}")
                    logo_attachment_path = None
            
            # Fallback to company settings logo_url if assets logo not available
            if not logo_attachment_path:
                company_logo_url = company_settings.get('logo_url', '')
                if company_logo_url:
                    try:
                        if company_logo_url.startswith('data:'):
                            # Extract base64 data and save to temp file
                            try:
                                header, data = company_logo_url.split(',', 1)
                                content_type = header.split(':')[1].split(';')[0]
                                img_data = base64.b64decode(data)
                                ext = 'png' if 'png' in content_type else ('jpg' if 'jpeg' in content_type or 'jpg' in content_type else 'png')
                                logo_temp = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}')
                                logo_temp.write(img_data)
                                logo_temp.close()
                                logo_attachment_path = logo_temp.name
                                logger.info(f"Extracted logo from data URI and saved to temp file")
                            except Exception as e:
                                logger.warning(f"Failed to extract logo from data URI: {e}")
                        elif company_logo_url.startswith('http://') or company_logo_url.startswith('https://'):
                            # Download and save to temp file
                            try:
                                response = requests.get(company_logo_url, timeout=5, allow_redirects=True)
                                if response.status_code == 200:
                                    content_type = response.headers.get('Content-Type', 'image/png')
                                    ext = 'png'
                                    if 'jpeg' in content_type or 'jpg' in content_type:
                                        ext = 'jpg'
                                    elif 'png' in content_type:
                                        ext = 'png'
                                    elif 'gif' in content_type:
                                        ext = 'gif'
                                    logo_temp = tempfile.NamedTemporaryFile(delete=False, suffix=f'.{ext}')
                                    logo_temp.write(response.content)
                                    logo_temp.close()
                                    logo_attachment_path = logo_temp.name
                                    logger.info(f"Downloaded company logo and saved to temp file: {len(response.content)} bytes")
                            except Exception as e:
                                logger.warning(f"Failed to download company logo: {e}")
                    except Exception as e:
                        logger.warning(f"Error processing company logo: {e}")
            
            # If no logo found, we'll use a placeholder URL (but it won't work as CID)
            if not logo_attachment_path:
                logger.warning("No logo found, email will show broken image or placeholder")
                logo_url = 'https://via.placeholder.com/44x44/00685e/ffffff?text=CANNA'
            else:
                # Ensure logo_url uses CID format when we have an attachment
                logo_url = f"cid:{logo_cid}"
            
            # Ensure logo_url is always a string (never None or empty)
            if not logo_url or not isinstance(logo_url, str):
                logger.error(f"logo_url is invalid: {logo_url}, using placeholder")
                logo_url = 'https://via.placeholder.com/44x44/00685e/ffffff?text=CANNA'
            
            # Log the final logo_url for debugging
            logger.info(f"Final logo_url for email: {logo_url} (has attachment: {logo_attachment_path is not None})")
            
            # Format dates for display
            date_display = quotation_date if quotation_date else 'N/A'
            total_display = f"{currency_symbol}{total_amount:.2f}"
            validity_display = valid_until_formatted
            
            # Get discount information if available
            discount_amount = 0
            has_discount = False
            if quotation_data:
                totals = quotation_data.get('totals', {})
                discount_amount = totals.get('discountAmount', 0) or 0
                if discount_amount > 0:
                    has_discount = True
                # Also check discount object
                discount = quotation_data.get('discount', {})
                if discount.get('type') and discount.get('type') != 'none' and discount.get('value', 0) > 0:
                    has_discount = True
                    # Recalculate if not in totals
                    if discount_amount == 0:
                        subtotal = totals.get('subtotal', 0) or 0
                        if discount.get('type') == 'percentage':
                            discount_amount = subtotal * (discount.get('value', 0) / 100)
                        elif discount.get('type') == 'fixed':
                            discount_amount = discount.get('value', 0)
            
            discount_display = f"-{currency_symbol}{discount_amount:.2f}" if has_discount else None
            
            # Get contact person from quotation_data or use customer_name
            contact_person = customer_name
            if quotation_data:
                customer = quotation_data.get('customer', {})
                if customer:
                    contact_person = customer.get('contact_person') or customer.get('name') or customer_name
            
            # Build discount row HTML if discount exists (matches Modern Card template structure)
            discount_row_html = ""
            if has_discount and discount_display:
                discount_row_html = f"""
              <tr class="details-row">
                <td class="details-cell">
                  <span class="details-label">Discount:</span>
                  <span class="details-value">{discount_display}</span>
                </td>
              </tr>"""
            
            # Generate view URL - use first allowed origin or placeholder
            # In production, you should set FRONTEND_URL in config
            from config import settings as app_settings
            frontend_base = app_settings.allowed_origins[0] if app_settings.allowed_origins else "http://localhost:5173"
            
            # Extract quote ID from quotation_data if available for URL building
            quote_id = ""
            if quotation_data:
                # Try to get quote ID from quotation_data
                quote_id = quotation_data.get('id', '')
                if not quote_id and quotation_number:
                    # Try to extract ID from quotation number (e.g., QUO2025/0009 -> 9)
                    try:
                        parts = quotation_number.split('/')
                        if len(parts) > 1:
                            quote_id = parts[-1].lstrip('0') or '1'
                    except:
                        pass
            
            view_url = f"{frontend_base}/quotebuilder?id={quote_id}" if quote_id else "#"
            download_url = "#"  # PDF is attached, so download link can be optional
            
            # Get company brand name (from company_settings or use company_name)
            brand_name = company_settings.get('company_name', company_name)
            if not brand_name:
                brand_name = "CANNA"
            
            # Create HTML email body - Modern Card Template
            body = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Quotation</title>
  <style>
    body, table, td, a {{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }}
    table, td {{ mso-table-lspace:0pt; mso-table-rspace:0pt; }}
    img {{ border:0; height:auto; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }}
    body {{ margin:0; padding:0; width:100% !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:#e8f4f3; color:#1a1a1a; font-size:16px; }}
    .email-wrapper {{ background:#e8f4f3; padding:24px 0; }}
    .container {{ max-width:680px; margin:0 auto; padding:0 15px; }}
    .main-card {{ background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(0,104,94,0.15); }}
    .header {{ background:#ffffff; padding:40px 36px; color:#00685e; }}
    .header-content {{ display:table; width:100%; }}
    .logo-cell {{ display:table-cell; vertical-align:middle; width:auto; }}
    .logo {{ height:52px; width:auto; max-width:200px; }}
    .quote-info {{ display:table-cell; vertical-align:middle; text-align:right; }}
    .quote-label {{ font-size:13px; color:#6b7280; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }}
    .quote-number {{ font-size:28px; font-weight:700; margin:0; color:#00685e; }}
    .body {{ padding:36px; }}
    .greeting {{ font-size:20px; font-weight:600; color:#1a1a1a; margin:0 0 16px 0; }}
    .intro-text {{ font-size:16px; color:#4a5568; margin:0 0 32px 0; line-height:1.7; }}
    .cards-grid {{ width:100%; border-collapse:separate; border-spacing:16px; margin:28px 0; }}
    .info-card {{ display:table-cell; background:#f8f9fa; border:2px solid #e5e7eb; border-radius:12px; padding:20px; vertical-align:top; width:50%; }}
    .card-label {{ font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; font-weight:600; }}
    .card-value {{ font-size:20px; font-weight:700; color:#00685e; word-wrap:break-word; white-space:normal; }}
    .details-section {{ background:#f8f9fa; border-radius:12px; padding:24px; margin:28px 0; }}
    .details-table {{ width:100%; border-collapse:collapse; }}
    .details-row {{ border-bottom:1px solid #e5e7eb; }}
    .details-row:last-child {{ border-bottom:none; }}
    .details-cell {{ padding:14px 0; font-size:15px; vertical-align:top; }}
    .details-label {{ font-weight:600; color:#374151; width:150px; display:inline-block; }}
    .details-value {{ font-weight:500; color:#1a1a1a; word-wrap:break-word; white-space:normal; }}
    .total-card {{ background:#00685e; border-radius:12px; padding:24px; margin:28px 0; text-align:center; }}
    .total-label {{ font-size:14px; color:#ffffff; opacity:0.9; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; }}
    .total-value {{ font-size:32px; font-weight:700; color:#ffffff; word-wrap:break-word; }}
    .footer {{ padding:28px 36px; background:#f8f9fa; border-top:1px solid #e5e7eb; }}
    .footer-text {{ font-size:14px; color:#6b7280; margin:0; line-height:1.6; }}
    @media only screen and (max-width:600px) {{
      .email-wrapper {{ padding:12px 0; }}
      .container {{ padding:0 10px; }}
      .header {{ padding:28px 24px !important; }}
      .header-content {{ display:block !important; }}
      .logo-cell {{ display:block !important; margin-bottom:16px; }}
      .quote-info {{ display:block !important; text-align:left !important; }}
      .quote-number {{ font-size:24px; color:#00685e !important; }}
      .body {{ padding:28px 24px !important; }}
      .greeting {{ font-size:18px; }}
      .intro-text {{ font-size:15px; }}
      .cards-grid {{ border-spacing:12px !important; }}
      .info-card {{ display:block !important; width:auto; margin-bottom:12px !important; }}
      .info-card:last-child {{ margin-bottom:0 !important; }}
      .details-section {{ padding:20px !important; }}
      .details-cell {{ padding:12px 0 !important; font-size:14px; }}
      .details-label {{ width:100% !important; display:block !important; margin-bottom:6px; }}
      .details-value {{ display:block !important; }}
      .total-card {{ padding:20px !important; }}
      .total-value {{ font-size:28px; }}
      .footer {{ padding:24px !important; }}
    }}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="main-card">
        <div class="header">
          <table class="header-content" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td class="logo-cell">
                <img src="{logo_url}" alt="Company Logo" class="logo" />
              </td>
              <td class="quote-info">
                <div class="quote-label">Quotation</div>
                <div class="quote-number">{quotation_number}</div>
              </td>
            </tr>
          </table>
        </div>
        <div class="body">
          <h2 class="greeting">Dear {contact_person},</h2>
          <p class="intro-text">
            Thank you for your interest in <strong>Canna</strong> products. Please find attached the quotation <strong>{quotation_number}</strong> with details of our latest offers and pricing.
          </p>
          <table class="cards-grid" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td class="info-card">
                <div class="card-label">Quote Date</div>
                <div class="card-value">{date_display}</div>
              </td>
              <td class="info-card">
                <div class="card-label">Valid Until</div>
                <div class="card-value">{validity_display}</div>
              </td>
            </tr>
          </table>
          <div class="details-section">
            <table class="details-table" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr class="details-row">
                <td class="details-cell">
                  <span class="details-label">Quotation Number:</span>
                  <span class="details-value">{quotation_number}</span>
                </td>
              </tr>
              <tr class="details-row">
                <td class="details-cell">
                  <span class="details-label">Contact Person:</span>
                  <span class="details-value">{contact_person}</span>
                </td>
              </tr>
              {discount_row_html}
            </table>
          </div>
          <div class="total-card">
            <div class="total-label">Total Amount</div>
            <div class="total-value">{total_display}</div>
          </div>
          <p class="intro-text" style="margin-top:28px; margin-bottom:0;">
            We look forward to continuing our partnership and supporting your business growth.
          </p>
        </div>
        <div class="footer">
          <p class="footer-text">
            <strong>{company_name}</strong> — If you have any questions, reply to this email or contact your account manager.
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>"""

            # Generate PDF attachment if quotation data is provided
            attachments = []
            temp_file_path = None
            logo_temp_path = None
            
            # Add logo as inline attachment if we have it
            if logo_attachment_path and os.path.exists(logo_attachment_path):
                try:
                    # Determine content type from file extension
                    ext = os.path.splitext(logo_attachment_path)[1].lower()
                    content_type_map = {
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.gif': 'image/gif'
                    }
                    content_type = content_type_map.get(ext, 'image/png')
                    
                    # Create inline attachment with CID using dict format (fastapi_mail expects dict for metadata)
                    logo_attachment = {
                        "file": logo_attachment_path,
                        "headers": {
                            "Content-ID": f"<{logo_cid}>",
                            "Content-Disposition": "inline"
                        },
                        "mime_type": content_type.split('/')[0],
                        "mime_subtype": content_type.split('/')[1] if '/' in content_type else 'png'
                    }
                    attachments.append(logo_attachment)
                    logo_temp_path = logo_attachment_path
                    logger.info(f"Added logo as inline attachment with CID: {logo_cid}, content-type: {content_type}")
                except Exception as e:
                    logger.warning(f"Failed to add logo as inline attachment: {e}", exc_info=True)
                    # Continue without inline attachment, will use CID which may not work
            
            if quotation_data:
                try:
                    # Use the HTML template (matching QuotePrint.jsx) to generate PDF
                    logger.info(f"Starting PDF generation for quotation {quotation_number}")
                    pdf_path = await self._generate_pdf_from_template(quotation_data)
                    if pdf_path and os.path.exists(pdf_path):
                        attachments.append(pdf_path)
                        temp_file_path = pdf_path
                        pdf_size = os.path.getsize(pdf_path)
                        logger.info(f"PDF attachment generated successfully for quotation {quotation_number}: {pdf_path} ({pdf_size} bytes)")
                    else:
                        logger.warning(f"PDF generation returned None or file doesn't exist for quotation {quotation_number}")
                except Exception as e:
                    logger.error(f"Failed to generate PDF attachment for quotation {quotation_number}: {str(e)}", exc_info=True)
                    # Continue without PDF attachment - DO NOT use ReportLab fallback

            # Create message
            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body,
                subtype="html",
                attachments=attachments if attachments else []
            )

            # Send email
            await self.fastmail.send_message(message)
            logger.info(f"Quotation email sent successfully to {to_email}")
            
            # Clean up temporary files if they were created
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temporary PDF file: {temp_file_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary PDF file {temp_file_path}: {str(e)}")
            
            if logo_temp_path and os.path.exists(logo_temp_path):
                try:
                    os.unlink(logo_temp_path)
                    logger.info(f"Cleaned up temporary logo file: {logo_temp_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary logo file {logo_temp_path}: {str(e)}")
            
            return True

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to send quotation email to {to_email}: {error_msg}")
            
            # Clean up temporary files if they were created
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temporary PDF file after error: {temp_file_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up temporary PDF file {temp_file_path}: {str(cleanup_error)}")
            
            if logo_temp_path and os.path.exists(logo_temp_path):
                try:
                    os.unlink(logo_temp_path)
                    logger.info(f"Cleaned up temporary logo file after error: {logo_temp_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up temporary logo file {logo_temp_path}: {str(cleanup_error)}")
            
            # Provide helpful error messages
            if "Connect call failed" in error_msg:
                logger.error("SMTP connection failed. Please check:")
                logger.error("1. SMTP server address (should be smtp.gmail.com for Gmail)")
                logger.error("2. Port number (587 for TLS, 465 for SSL)")
                logger.error("3. Internet connection")
                logger.error("4. Firewall settings")
            elif "Authentication failed" in error_msg:
                logger.error("Authentication failed. Please check:")
                logger.error("1. Username/email address")
                logger.error("2. Password (use App Password for Gmail)")
                logger.error("3. 2-Factor Authentication is enabled")
            
            return False

    async def send_test_email(self, to_email: str) -> bool:
        """
        Send a test email to verify email configuration
        """
        if not self.is_configured:
            logger.error("Email service is not configured")
            return False
            
        try:
            message = MessageSchema(
                subject="Test Email from Grow United Italy",
                recipients=[to_email],
                body="This is a test email to verify email configuration.",
                subtype="plain"
            )
            
            await self.fastmail.send_message(message)
            logger.info(f"Test email sent successfully to {to_email}")
            return True

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to send test email to {to_email}: {error_msg}")
            
            # Provide helpful error messages
            if "Connect call failed" in error_msg:
                logger.error("SMTP connection failed. Please check:")
                logger.error("1. SMTP server address (should be smtp.gmail.com for Gmail)")
                logger.error("2. Port number (587 for TLS, 465 for SSL)")
                logger.error("3. Internet connection")
                logger.error("4. Firewall settings")
            elif "Authentication failed" in error_msg:
                logger.error("Authentication failed. Please check:")
                logger.error("1. Username/email address")
                logger.error("2. Password (use App Password for Gmail)")
                logger.error("3. 2-Factor Authentication is enabled")
            
                return False

    async def _generate_pdf_from_template(self, quotation_data: Dict[str, Any]) -> Optional[str]:
        """
        Generate PDF using the existing quote print template
        """
        try:
            # Store quotation data in localStorage for the frontend template
            # We'll use a simple approach: save to a temporary file and serve it
            temp_data_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
            json.dump(quotation_data, temp_data_file)
            temp_data_file.close()
            
            # Create a simple HTML version of the quote
            html_content = self._generate_html_quote(quotation_data)
            
            # Generate PDF using wkhtmltopdf directly (no ReportLab fallback to ensure correct template)
            import subprocess
                
            # Create PDF file
            pdf_path = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            pdf_path.close()
            
            # Find wkhtmltopdf binary
            which_result = subprocess.run(['which', 'wkhtmltopdf'], capture_output=True, text=True)
            wkhtmltopdf_paths = [
                '/usr/local/bin/wkhtmltopdf',
                '/usr/bin/wkhtmltopdf',
                which_result.stdout.strip() if which_result.returncode == 0 else None
            ]
            wkhtmltopdf_path = next((p for p in wkhtmltopdf_paths if p and os.path.exists(p)), None)
            
            if not wkhtmltopdf_path:
                logger.error("wkhtmltopdf binary not found in any standard location")
                raise Exception("wkhtmltopdf binary not found. Cannot generate PDF with correct template.")
            
            logger.info(f"Using wkhtmltopdf at: {wkhtmltopdf_path}")
            
            # Save HTML to temporary file
            html_temp = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.html', encoding='utf-8')
            html_temp.write(html_content)
            html_temp.close()
            
            try:
                # Use xvfb-run for headless rendering
                cmd = [
                    'xvfb-run', '-a', '--server-args=-screen 0 1024x768x24', wkhtmltopdf_path,
                    '--page-size', 'A4',
                    '--margin-top', '0',
                    '--margin-right', '0',
                    '--margin-bottom', '0',
                    '--margin-left', '0',
                    '--encoding', 'UTF-8',
                    '--enable-local-file-access',
                    '--load-error-handling', 'ignore',
                    '--load-media-error-handling', 'ignore',
                    '--print-media-type',
                    '--no-stop-slow-scripts',
                    '--javascript-delay', '500',
                    '--quiet'
                ]
                
                # Don't use --no-images - we want to include logos
                # Logo will be hidden via onerror if URL is invalid
                
                cmd.extend([html_temp.name, pdf_path.name])
                
                logger.info(f"Running wkhtmltopdf command: {' '.join(cmd[:5])}... [html] [pdf]")
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False
                )
                
                if result.returncode != 0:
                    error_msg = result.stderr or result.stdout or "Unknown error"
                    logger.error(f"wkhtmltopdf failed (exit code {result.returncode}): {error_msg[:500]}")
                    raise Exception(f"wkhtmltopdf failed (exit code {result.returncode}): {error_msg[:200]}")
                
                if not os.path.exists(pdf_path.name):
                    raise Exception("PDF file was not created by wkhtmltopdf")
                
                if os.path.getsize(pdf_path.name) == 0:
                    raise Exception("PDF file is empty")
                
                logger.info(f"Successfully generated PDF quote with wkhtmltopdf: {pdf_path.name} ({os.path.getsize(pdf_path.name)} bytes)")
                
            finally:
                # Clean up HTML temp file
                if os.path.exists(html_temp.name):
                    os.unlink(html_temp.name)
            
            # Clean up the data file
            if os.path.exists(temp_data_file.name):
                os.unlink(temp_data_file.name)
            
            return pdf_path.name
            
        except Exception as e:
            logger.error(f"Failed to generate PDF from template: {str(e)}")
            return None

    def _generate_pdf_with_reportlab(self, quotation_data: Dict[str, Any], output_path: str):
        """
        Generate PDF using ReportLab
        """
        try:
            # Create PDF document
            doc = SimpleDocTemplate(output_path, pagesize=A4, 
                                  rightMargin=72, leftMargin=72, 
                                  topMargin=72, bottomMargin=18)
            
            # Container for the 'Flowable' objects
            elements = []
            
            # Get styles
            styles = getSampleStyleSheet()
            
            # Title style
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=30,
                alignment=1  # Center alignment
            )
            
            # Company info style
            company_style = ParagraphStyle(
                'CompanyInfo',
                parent=styles['Normal'],
                fontSize=10,
                spaceAfter=6
            )
            
            # Add company header
            company_settings = quotation_data.get('company_settings', {})
            company_name = company_settings.get('company_name', 'Grow United Italy')
            company_address = company_settings.get('address', '')
            company_email = company_settings.get('email', '')
            company_phone = company_settings.get('phone', '')
            
            elements.append(Paragraph(company_name, title_style))
            elements.append(Spacer(1, 12))
            
            if company_address:
                elements.append(Paragraph(company_address.replace('\n', '<br/>'), company_style))
            if company_email:
                elements.append(Paragraph(f"Email: {company_email}", company_style))
            if company_phone:
                elements.append(Paragraph(f"Phone: {company_phone}", company_style))
            
            elements.append(Spacer(1, 20))
            
            # Quotation title
            quotation_number = quotation_data.get('quotation_number', 'N/A')
            elements.append(Paragraph(f"QUOTATION #{quotation_number}", title_style))
            elements.append(Spacer(1, 20))
            
            # Customer info
            customer = quotation_data.get('customer', {})
            customer_name = customer.get('company_name', '')
            customer_email = customer.get('email', '')
            customer_address = customer.get('address', '')
            
            if customer_name:
                elements.append(Paragraph(f"<b>Bill To:</b>", styles['Heading2']))
                elements.append(Paragraph(customer_name, company_style))
                if customer_address:
                    elements.append(Paragraph(customer_address.replace('\n', '<br/>'), company_style))
                if customer_email:
                    elements.append(Paragraph(f"Email: {customer_email}", company_style))
                elements.append(Spacer(1, 20))
            
            # Quotation details
            date = quotation_data.get('date', '')
            valid_until = quotation_data.get('valid_until', '')
            
            if date or valid_until:
                elements.append(Paragraph("<b>Quotation Details:</b>", styles['Heading2']))
                if date:
                    formatted_date = EmailService.format_date(date)
                    elements.append(Paragraph(f"Date: {formatted_date}", company_style))
                if valid_until:
                    formatted_valid = EmailService.format_date(valid_until)
                    elements.append(Paragraph(f"Valid Until: {formatted_valid}", company_style))
                elements.append(Spacer(1, 20))
            
            # Line items table
            line_items = quotation_data.get('line_items', [])
            if line_items:
                elements.append(Paragraph("<b>Items:</b>", styles['Heading2']))
                elements.append(Spacer(1, 12))
                
                # Create table data (Serial, Description, Quantity, VAT, Sale Price, Discount, Price, Total)
                table_data = [['#', 'Description', 'Qty', 'VAT', 'Sale Price', 'Discount (%)', 'Price', 'Total']]
                vat_rate = quotation_data.get('vat_rate', 4)
                for index, item in enumerate(line_items, start=1):
                    quantity = float(item.get('quantity', 0) or 0)
                    unit_price = float(item.get('unit_price', 0) or 0)
                    discount_pct = 0.0
                    discounted_unit = unit_price * (1 - discount_pct / 100)
                    total_value = quantity * discounted_unit
                    table_data.append([
                        str(index),
                        item.get('description', ''),
                        f"{quantity:.3f}",
                        f"{vat_rate}%",
                        f"€{unit_price:.2f}",
                        f"{discount_pct:.0f}%",
                        f"€{discounted_unit:.2f}",
                        f"€{total_value:.2f}"
                    ])
                
                # Create table
                table = Table(table_data, colWidths=[0.4*inch, 2.6*inch, 0.8*inch, 0.8*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.9*inch])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                elements.append(table)
                elements.append(Spacer(1, 20))
            
            # Totals
            totals = quotation_data.get('totals', {})
            if totals:
                elements.append(Paragraph("<b>Summary:</b>", styles['Heading2']))
                elements.append(Spacer(1, 12))
                
                total_data = []
                if 'subtotal' in totals:
                    total_data.append(['Subtotal:', f"€{totals['subtotal']:.2f}"])
                if 'discountAmount' in totals and totals['discountAmount'] > 0:
                    total_data.append(['Discount:', f"-€{totals['discountAmount']:.2f}"])
                if 'vatAmount' in totals and totals['vatAmount'] > 0:
                    total_data.append([f"VAT ({totals.get('vatRate', 0)}%):", f"€{totals['vatAmount']:.2f}"])
                if 'total' in totals:
                    total_data.append(['<b>TOTAL:</b>', f"<b>€{totals['total']:.2f}</b>"])
                
                if total_data:
                    total_table = Table(total_data, colWidths=[2*inch, 1*inch])
                    total_table.setStyle(TableStyle([
                        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
                        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, -1), (-1, -1), 12),
                        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black)
                    ]))
                    elements.append(total_table)
                    elements.append(Spacer(1, 20))
            
            # Bank details section (from company_settings)
            bank_name_branch = company_settings.get('bank_name_branch')
            bank_address_line1 = company_settings.get('bank_address_line1')
            bank_address_line2 = company_settings.get('bank_address_line2')
            bank_account_number = company_settings.get('account_number')
            bank_iban = company_settings.get('iban')
            bank_bic_swift = company_settings.get('bic_swift')

            if any([bank_name_branch, bank_address_line1, bank_address_line2, bank_account_number, bank_iban, bank_bic_swift]):
                elements.append(Paragraph("<b>Bank Details:</b>", styles['Heading2']))
                if bank_name_branch:
                    elements.append(Paragraph(str(bank_name_branch), company_style))
                if bank_address_line1:
                    elements.append(Paragraph(str(bank_address_line1), company_style))
                if bank_address_line2:
                    elements.append(Paragraph(str(bank_address_line2), company_style))
                if bank_account_number:
                    elements.append(Paragraph(f"Account nr.: {bank_account_number}", company_style))
                if bank_iban:
                    elements.append(Paragraph(f"IBAN-code: {bank_iban}", company_style))
                if bank_bic_swift:
                    elements.append(Paragraph(f"BIC/Swift: {bank_bic_swift}", company_style))
                elements.append(Spacer(1, 20))

            # Notes
            notes = quotation_data.get('notes', '')
            if notes:
                elements.append(Paragraph("<b>Notes:</b>", styles['Heading2']))
                elements.append(Paragraph(notes, company_style))
                elements.append(Spacer(1, 20))
            
            # Build PDF
            doc.build(elements)
            logger.info(f"Successfully generated PDF with ReportLab: {output_path}")
            
        except Exception as e:
            logger.error(f"Failed to generate PDF with ReportLab: {str(e)}")
            raise e

    def _generate_html_quote(self, quotation_data: Dict[str, Any]) -> str:
        """
        Generate HTML content for the quote using the same structure as QuotePrint.jsx
        """
        company_settings = quotation_data.get('company_settings', {})
        customer = quotation_data.get('customer', {})
        # Handle both 'items' (from QuotePrint/frontend) and 'line_items' (legacy)
        line_items = quotation_data.get('items', quotation_data.get('line_items', []))
        totals = quotation_data.get('totals', {})
        quotation_number = quotation_data.get('quotation_number', 'N/A')
        date = quotation_data.get('date', 'N/A')
        valid_until = quotation_data.get('valid_until', 'N/A')
        notes = quotation_data.get('notes', '')
        discount = quotation_data.get('discount', {})
        vat_rate = quotation_data.get('vat_rate', 4)
        
        # Format currency
        def format_currency(amount, currency='EUR'):
            return f"€{amount:.2f}" if amount else "€0.00"
        
        # Format date
        def format_date(date_str):
            if not date_str:
                return ''
            try:
                from datetime import datetime
                if isinstance(date_str, str):
                    # Try to parse the date - handle different formats
                    if 'Z' in date_str:
                        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    elif 'T' in date_str:
                        dt = datetime.fromisoformat(date_str)
                    elif '/' in date_str and len(date_str.split('/')) == 3:
                        # Handle DD/MM/YYYY format
                        dt = datetime.strptime(date_str, '%d/%m/%Y')
                    else:
                        # Try parsing as simple date YYYY-MM-DD
                        dt = datetime.strptime(date_str, '%Y-%m-%d')
                    return dt.strftime('%d/%m/%Y %H:%M:%S')
                return str(date_str)
            except Exception as e:
                logger.warning(f"Failed to format date '{date_str}': {e}")
                return str(date_str) if date_str else ''
        
        # Prepare company address (Address Line 1, Address Line 2, City + Postal, Country)
        address_lines: list[str] = []
        address_line1 = company_settings.get('address_line1')
        address_line2 = company_settings.get('address_line2')
        city = company_settings.get('city')
        postal_code = company_settings.get('postal_code')
        country = company_settings.get('country')
        if address_line1:
            address_lines.append(address_line1)
        if address_line2:
            address_lines.append(address_line2)
        city_postal = ", ".join([x for x in [city, postal_code] if x])
        if city_postal:
            address_lines.append(city_postal)
        if country:
            address_lines.append(country)
        # Each address line will be a separate div for better formatting
        address_html = "<br>".join(address_lines)

        # Prepare company contact
        company_email = company_settings.get('email') or ''
        company_website = company_settings.get('website') or ''
        vat_number = company_settings.get('vat_number') or ''

        # Prepare bank details
        bank_name_branch = company_settings.get('bank_name_branch') or ''
        bank_address_line1 = company_settings.get('bank_address_line1') or ''
        bank_address_line2 = company_settings.get('bank_address_line2') or ''
        bank_account_number = company_settings.get('account_number') or ''
        bank_iban = company_settings.get('iban') or ''
        bank_bic_swift = company_settings.get('bic_swift') or ''
        bank_address_html = "<br>".join([x for x in [bank_address_line1, bank_address_line2] if x])
        
        # Handle logo - download and convert to base64 if it's a URL, or use as-is if it's already base64
        logo_html = ''
        logo_url = company_settings.get('logo_url', '')
        if logo_url:
            try:
                # Check if it's already a data URI (base64)
                if logo_url.startswith('data:'):
                    logo_html = f'<img src="{logo_url}" alt="Company Logo" class="company-logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" onerror="this.style.display=\'none\';" />'
                elif logo_url.startswith('http://') or logo_url.startswith('https://'):
                    # Download and convert to base64
                    try:
                        response = requests.get(logo_url, timeout=5, allow_redirects=True)
                        if response.status_code == 200:
                            # Get content type
                            content_type = response.headers.get('Content-Type', 'image/png')
                            # Convert to base64
                            img_base64 = base64.b64encode(response.content).decode('utf-8')
                            data_uri = f'data:{content_type};base64,{img_base64}'
                            logo_html = f'<img src="{data_uri}" alt="Company Logo" class="company-logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" />'
                            logger.info(f"Logo downloaded and converted to base64: {len(img_base64)} bytes")
                        else:
                            logger.warning(f"Failed to download logo: HTTP {response.status_code}")
                    except Exception as e:
                        logger.warning(f"Failed to download logo from {logo_url}: {e}")
                        # Fallback to direct URL
                        logo_html = f'<img src="{logo_url}" alt="Company Logo" class="company-logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" onerror="this.style.display=\'none\';" />'
                else:
                    # Assume it's a local path or direct URL
                    logo_html = f'<img src="{logo_url}" alt="Company Logo" class="company-logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" onerror="this.style.display=\'none\';" />'
            except Exception as e:
                logger.warning(f"Error processing logo URL: {e}")
                logo_html = f'<img src="{logo_url}" alt="Company Logo" class="company-logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" onerror="this.style.display=\'none\';" />'

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Quotation {quotation_number}</title>
            <style>
                /* External font import removed to avoid wkhtmltopdf network errors */
                
                /* Page Setup */
                @page {{
                    size: A4;
                    margin: 0;
                    margin-bottom: 40mm; /* Reserve space for footer on each page */
                }}
                
                body {{ 
                    background: white;
                    margin: 0; 
                    padding: 0; 
                    font-family: Arial, sans-serif;
                    font-size: 12px; /* Increased from 11px */
                    line-height: 1.6; /* Increased for better readability */
                    color: #333; /* Slightly darker text */
                }}
                
                html {{
                    margin: 0;
                    padding: 0;
                    width: 100%;
                }}
                
                body {{
                    text-align: center; /* Center align for wkhtmltopdf */
                }}
                
                .print-document {{
                    width: 100%;
                    position: relative;
                    min-height: 100vh;
                    display: block;
                    text-align: center; /* Center align content */
                }}

                .page-container {{
                    width: 100%;
                    display: inline-block;
                    text-align: center;
                }}
                
                .page {{
                    width: 210mm;
                    min-height: 297mm;
                    box-sizing: border-box;
                    padding: 20mm 14mm 45mm 14mm; /* Increased bottom padding to 45mm to prevent footer overlap */
                    background: white;
                    position: relative;
                    margin: 0 auto; /* Center the page */
                    display: inline-block;
                    text-align: left; /* Reset text-align inside page - content should be left-aligned */
                }}

                .page-header {{
                    margin-bottom: 15px;
                }}
                
                .company-logo-section {{
                    margin-bottom: 15px;
                }}
                
                .company-logo {{
                    max-width: 120px;
                    max-height: 60px;
                    object-fit: contain;
                }}
                
                /* Quotation Title */
                .quotation-title {{
                    font-size: 20px; /* Increased from 18px */
                    font-weight: bold;
                    text-align: center;
                    margin: 25px 0 20px 0;
                    color: #111;
                }}
                
                /* Meta Information - Table layout for wkhtmltopdf compatibility */
                .meta-grid {{
                    display: table;
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: separate;
                    border-spacing: 15px;
                    margin-bottom: 15px;
                    font-size: 12px; /* Increased from 11px */
                }}
                
                .meta-item {{
                    display: table-cell;
                    width: 33.33%;
                    vertical-align: top;
                    padding: 0;
                }}
                
                .meta-label {{
                    font-weight: bold;
                    margin-bottom: 4px; /* Increased spacing */
                    display: block;
                }}
                
                .meta-value {{
                    display: block;
                }}
                
                .additional-meta {{
                    display: table;
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: separate;
                    border-spacing: 15px;
                    margin-bottom: 25px;
                    font-size: 12px; /* Increased from 11px */
                }}
                
                /* Table Styles */
                .quote-table {{
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px; /* Increased from 10px */
                    margin-bottom: 20px;
                    page-break-inside: auto;
                }}
                
                .quote-table thead {{
                    display: table-header-group;
                }}
                
                .quote-table th {{
                    background-color: #f5f5f5; /* Slightly darker grey */
                    border: 1px solid #ddd; /* Slightly darker border */
                    padding: 10px 6px; /* Increased padding */
                    text-align: center;
                    font-weight: bold;
                    font-size: 11px;
                    color: #222;
                }}
                
                .quote-table td {{
                    border: 1px solid #e5e5e5;
                    padding: 8px 6px; /* Increased padding */
                    font-size: 11px;
                    vertical-align: top;
                }}
                
                .quote-table tr {{
                    page-break-inside: avoid;
                    page-break-after: auto;
                }}
                
                .qty-col {{ width: 45px; text-align: right; }}
                .serial-col {{ width: 35px; text-align: right; }}
                .desc-col {{ width: 180px; text-align: left; }}
                .tax-col {{ width: 80px; text-align: center; }}
                .price-col {{ width: 55px; text-align: right; }}
                .disc-col {{ width: 45px; text-align: right; }}
                .total-col {{ width: 55px; text-align: right; }}
                
                /* Totals Section - Right Aligned */
                .totals-section {{
                    margin-top: 25px;
                    margin-bottom: 30px;
                    text-align: right;
                    width: 100%;
                }}
                
                .totals-table {{
                    width: 280px;
                    margin-left: auto;
                    margin-right: 0;
                    font-size: 13px;
                    text-align: right;
                }}
                
                .totals-row {{
                    display: table-row;
                }}
                
                .totals-row span {{
                    display: table-cell;
                    padding: 6px 0;
                    border-bottom: 1px solid #eee;
                    text-align: left;
                }}
                
                .totals-row span:first-child {{
                    text-align: left;
                    padding-right: 20px;
                }}
                
                .totals-row span:last-child {{
                    text-align: right;
                    font-weight: normal;
                }}
                
                .totals-row.total-final {{
                    font-weight: bold;
                }}
                
                .totals-row.total-final span {{
                    font-size: 16px;
                    border-bottom: 2px solid #333;
                    border-top: 2px solid #333;
                    margin-top: 10px;
                    padding-top: 10px;
                    padding-bottom: 10px;
                }}
                
                .totals-row.total-final span:last-child {{
                    font-weight: bold;
                }}
                
                .payment-term-section {{
                    margin: 8px 0;
                    font-size: 12px;
                    font-weight: bold;
                    padding: 6px 0;
                    border-bottom: 1px solid #eee;
                    display: table-row;
                }}
                
                .payment-term-section span {{
                    display: table-cell;
                    text-align: left;
                    padding-right: 20px;
                }}
                
                .payment-term-section span:last-child {{
                    text-align: right;
                }}
                
                /* Footer - Fixed to Bottom - Repeats on every page */
                .footer {{
                    position: fixed;
                    bottom: 0;
                    left: 50%;
                    margin-left: -105mm; /* Half of 210mm to center */
                    width: 210mm;
                    height: 30mm;
                    padding: 4mm 30px 4mm 30px;
                    background: white;
                    border-top: 1px solid #ddd;
                    font-size: 11px;
                    line-height: 1.4;
                    box-sizing: border-box;
                    display: table;
                    table-layout: fixed;
                    z-index: 10;
                    page-break-inside: avoid;
                }}
                
                .footer-left, .footer-right {{
                    display: table-cell;
                    width: 50%;
                    vertical-align: top;
                    padding-right: 15px;
                    text-align: left; /* Ensure footer content is left-aligned */
                }}
                
                .footer-right {{
                    padding-right: 0;
                    padding-left: 15px;
                    text-align: left; /* Ensure footer content is left-aligned */
                }}
                
                .footer {{
                    text-align: left; /* Ensure footer content is left-aligned, not center */
                }}
                
                .footer .company-name {{
                    font-weight: bold;
                    margin-bottom: 3px;
                    font-size: 12px; /* Increased from 11px */
                }}
                
                .footer .bank-title {{
                    font-weight: bold;
                    margin-bottom: 3px;
                }}
                
                /* Page Number - Fixed to repeat on every page */
                .page-number {{
                    position: fixed;
                    bottom: 8mm;
                    left: 50%;
                    margin-left: 91mm; /* Position: page center (105mm) - 14mm padding from right = 91mm from center */
                    font-size: 11px; /* Increased from 10px */
                    z-index: 11;
                    color: #333;
                    white-space: nowrap;
                    display: block;
                    visibility: visible;
                    opacity: 1;
                    text-align: right;
                }}
                
                /* Print Styles */
                @media print {{
                    html, body {{ 
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        text-align: center !important; /* Center align for PDF */
                        width: 100% !important;
                    }}
                    .print-document {{ 
                        width: 100% !important;
                        min-height: auto !important;
                        display: block !important;
                        text-align: center !important;
                    }}
                    .page-container {{
                        display: inline-block !important;
                        width: auto !important;
                        text-align: center !important;
                    }}
                    .page {{
                        margin: 0 auto !important; /* Center the page */
                        box-shadow: none !important;
                        page-break-after: auto; /* Changed from always to auto */
                        min-height: auto; /* Allow content to determine height */
                        padding-bottom: 45mm !important; /* Increased to prevent footer overlap */
                        overflow: visible;
                        display: inline-block !important;
                        text-align: left !important; /* Reset text-align inside page */
                    }}
                    .no-print {{ display: none !important; }}
                    .footer {{
                        position: fixed !important;
                        left: 50% !important;
                        margin-left: -105mm !important; /* Half of 210mm to center */
                        width: 210mm !important;
                        display: table !important;
                        table-layout: fixed !important;
                        text-align: left !important; /* Ensure footer content is left-aligned */
                    }}
                    .footer-left, .footer-right {{
                        display: table-cell !important;
                        width: 50% !important;
                        vertical-align: top !important;
                        text-align: left !important; /* Ensure footer content is left-aligned */
                    }}
                    .footer-right {{
                        padding-left: 15px !important;
                        padding-right: 0 !important;
                        text-align: left !important; /* Ensure footer content is left-aligned */
                    }}
                    .page-number {{
                        position: fixed !important;
                        left: 50% !important;
                        margin-left: 91mm !important; /* Position from center: (210mm/2) - 14mm padding = 91mm */
                        visibility: visible !important;
                        opacity: 1 !important;
                        display: block !important;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="print-document">
                <div class="page-container">
                    <div class="page">
                        <div class="page-header"></div>

                        <!-- Company Logo Section -->
                        <div class="company-logo-section">
                            {logo_html}
                        </div>

                        <!-- Main Title -->
                        <div class="quotation-title">Quotation No. {quotation_number}</div>

                        <!-- Meta Information -->
                        <div class="meta-grid">
                            <div class="meta-item">
                                <div class="meta-label">Quotation Date:</div>
                                <div class="meta-value">{format_date(date)}</div>
                            </div>
                            <div class="meta-item">
                                <div class="meta-label">Delivery Date:</div>
                                <div class="meta-value">{format_date(valid_until)}</div>
                            </div>
                            <div class="meta-item">
                                <div class="meta-label">Payment Term:</div>
                                <div class="meta-value">Prepaid</div>
                            </div>
                        </div>

                        <div class="additional-meta">
                            <div class="meta-item">
                                <div class="meta-label">Order Contact:</div>
                                <div class="meta-value">{customer.get('company_name', '')}, {customer.get('contact_person', '')}</div>
                                <div class="meta-value">{customer.get('address', '')}</div>
                            </div>
                            <div class="meta-item">
                                <div class="meta-label">Your Reference:</div>
                                <div class="meta-value">ORDER No. {quotation_number}</div>
                            </div>
                            <div class="meta-item">
                                <div class="meta-label">Discount:</div>
                                <div class="meta-value">
                                    {format_currency(totals.get('discountAmount', 0))} of {format_currency(totals.get('subtotal', 0))}
                                </div>
                            </div>
                        </div>

                        <!-- Items Table -->
                        <table class="quote-table">
                            <thead>
                                <tr>
                                    <th class="serial-col">S.No.</th>
                                    <th class="desc-col">Description</th>
                                    <th class="qty-col">Quantity</th>
                                    <th class="tax-col">VAT</th>
                                    <th class="price-col">Sale Price</th>
                                    <th class="disc-col">Discount (%)</th>
                                    <th class="price-col">Price</th>
                                    <th class="total-col">Total</th>
                                </tr>
                            </thead>
                            <tbody>
        """
        
        # Add line items
        for idx, item in enumerate(line_items, start=1):
            total_price = item.get('quantity', 0) * item.get('unit_price', 0)
            # Handle discount like QuotePrint.jsx: discount?.type === 'percentage' ? discount.value : 0
            discount_value = discount.get('value', 0) if discount.get('type') == 'percentage' else 0
            discounted_price = item.get('unit_price', 0) * (1 - discount_value / 100)
            
            # Get product details - match QuotePrint.jsx: item.product_name_snapshot || item.product_name
            display_name = item.get('product_name_snapshot') or item.get('product_name') or item.get('description', '')
            # Match QuotePrint.jsx: item.product_code_snapshot || item.sku
            display_sku = item.get('product_code_snapshot') or item.get('sku', '')
            
            html += f"""
                                <tr>
                                    <td class=\"serial-col\">{idx}</td>
                                    <td class="desc-col">
                                        <div>
                                            <div style="font-weight: bold; margin-bottom: 2px;">{display_name}</div>
                                            <div style="font-size: 10px; color: #666;">{display_sku}</div>
                                        </div>
                                    </td>
                                    <td class="qty-col">{item.get('quantity', 0):.3f}</td>
                                    <td class="tax-col">VAT at {vat_rate}%</td>
                                    <td class="price-col">{format_currency(item.get('unit_price', 0))}</td>
                                    <td class="disc-col">{discount_value}%</td>
                                    <td class="price-col">{format_currency(discounted_price)}</td>
                                    <td class="total-col">{format_currency(total_price * (1 - discount_value / 100))}</td>
                                </tr>
            """
        
        html += f"""
                            </tbody>
                        </table>

                        <!-- Totals Section - Right Aligned -->
                        <div class="totals-section">
                            <table class="totals-table" style="margin-left: auto; margin-right: 0;">
                                <tr class="totals-row">
                                    <td style="text-align: left; padding-right: 20px; padding-bottom: 6px; border-bottom: 1px solid #eee;">Total Without VAT</td>
                                    <td style="text-align: right; padding-bottom: 6px; border-bottom: 1px solid #eee;">{format_currency((totals.get('subtotal', 0) - totals.get('discountAmount', 0)))}</td>
                                </tr>
                                
                                <tr class="totals-row">
                                    <td style="text-align: left; padding-right: 20px; padding: 6px 0; border-bottom: 1px solid #eee;">Discount</td>
                                    <td style="text-align: right; padding: 6px 0; border-bottom: 1px solid #eee;">-{format_currency(totals.get('discountAmount', 0))}</td>
                                </tr>
                                
                                <tr class="payment-term-section">
                                    <td style="text-align: left; padding-right: 20px; padding: 6px 0; border-bottom: 1px solid #eee; font-weight: bold;">Payment Term</td>
                                    <td style="text-align: right; padding: 6px 0; border-bottom: 1px solid #eee; font-weight: bold;">Prepaid</td>
                                </tr>
                                
                                <tr class="totals-row">
                                    <td style="text-align: left; padding-right: 20px; padding: 6px 0; border-bottom: 1px solid #eee;">VAT ({vat_rate}%)</td>
                                    <td style="text-align: right; padding: 6px 0; border-bottom: 1px solid #eee;">{format_currency(totals.get('vatAmount', totals.get('taxAmount', 0)))}</td>
                                </tr>
                                
                                <tr class="totals-row total-final">
                                    <td style="text-align: left; padding-right: 20px; padding: 10px 0; border-top: 2px solid #333; border-bottom: 2px solid #333; font-weight: bold; font-size: 16px;">Total</td>
                                    <td style="text-align: right; padding: 10px 0; border-top: 2px solid #333; border-bottom: 2px solid #333; font-weight: bold; font-size: 16px;">{format_currency(totals.get('total', 0))}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Notes Section -->
        """
        
        if notes:
            html += f"""
                        <div class="notes-section" style="margin-top: 20px; margin-bottom: 40px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
                            <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Additional Notes:</div>
                            <div style="font-size: 12px; line-height: 1.5; white-space: pre-wrap;">{notes}</div>
                        </div>
            """
        
        html += f"""
                        <!-- Spacing before footer -->
                        <div style="height: 40px;"></div>
                    </div>
                </div>

                <!-- Footer - Fixed to Bottom -->
                <div class="footer">
                    <div class="footer-left">
                        <div class="company-name">{company_settings.get('company_name', 'Grow United Italia SRL')}</div>
                        <div>{address_html if address_html else 'Via Paleocapa 1<br>Milano, 20121<br>Italy'}</div>
                        <div>{company_email or 'administration@growunited.it'}</div>
                        <div>{company_website or 'www.canna-it.com'}</div>
                        <div>IVA {vat_number or 'IT13328670966'}</div>
                    </div>
                    <div class="footer-right">
                        <div class="bank-title">Bank Details:</div>
                        <div>{bank_name_branch or 'BANCA PASSADORE & C. S.P.A. - CORSO MATTEOTTI, 7 - MILANO 20121'}</div>
                        <div>{bank_address_html if bank_address_html else ''}</div>
                        <div>Account nr.: {bank_account_number or '1118520'}</div>
                        <div>IBAN-code: {bank_iban or 'IT87I0333201600000001118520'}</div>
                        <div>BIC/Swift: {bank_bic_swift or 'PASBITGG'}</div>
                    </div>
                </div>

                <!-- Page Number -->
                <div class="page-number">Page: 1 / 1</div>
            </div>
        </body>
        </html>
        """
        
        return html

    @staticmethod
    def format_date(date_str):
        if not date_str:
            return ''
        try:
            from datetime import datetime
            if isinstance(date_str, str):
                # Try to parse the date - handle different formats
                if 'Z' in date_str:
                    dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                elif 'T' in date_str:
                    dt = datetime.fromisoformat(date_str)
                elif '/' in date_str and len(date_str.split('/')) == 3:
                    # Handle DD/MM/YYYY format
                    dt = datetime.strptime(date_str, '%d/%m/%Y')
                else:
                    # Try parsing as simple date YYYY-MM-DD
                    dt = datetime.strptime(date_str, '%Y-%m-%d')
                
                return dt.strftime('%d/%m/%Y %H:%M:%S')
            return str(date_str)
        except Exception as e:
            logger.warning(f"Failed to format date '{date_str}': {e}")
            return str(date_str) if date_str else ''

# Global email service instance
email_service = EmailService()
