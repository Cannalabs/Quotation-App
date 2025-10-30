from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from typing import List, Optional, Dict, Any
from config import settings
import logging
import tempfile
import os
import json
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
    
    def _initialize_email_service(self):
        # Only initialize if email is configured
        if settings.mail_from and settings.mail_server:
            # Fix common SMTP server typos
            mail_server = settings.mail_server.lower().strip()
            if 'smpt.gmail.com' in mail_server:
                mail_server = 'smtp.gmail.com'
                logger.warning(f"Fixed SMTP server typo: {settings.mail_server} -> {mail_server}")
            elif 'smpt.' in mail_server:
                mail_server = mail_server.replace('smpt.', 'smtp.')
                logger.warning(f"Fixed SMTP server typo: {settings.mail_server} -> {mail_server}")
            
            # Debug logging
            logger.info(f"Initializing email service with server: {mail_server}")
            logger.info(f"Email from: {settings.mail_from}")
            logger.info(f"Port: {settings.mail_port}")
            
            self.config = ConnectionConfig(
                MAIL_USERNAME=settings.mail_username,
                MAIL_PASSWORD=settings.mail_password,
                MAIL_FROM=settings.mail_from,
                MAIL_FROM_NAME=settings.mail_from_name,
                MAIL_PORT=settings.mail_port,
                MAIL_SERVER=mail_server,
                MAIL_STARTTLS=settings.mail_tls,
                MAIL_SSL_TLS=settings.mail_ssl,
                USE_CREDENTIALS=settings.mail_use_credentials,
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
        """Reinitialize the email service with current settings"""
        self._initialize_email_service()

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
            
            # Create email body
            body = f"""Dear {customer_name},

Please find attached our quotation {quotation_number} for your review.

Total Amount: €{total_amount:.2f}
Valid Until: {valid_until}

{notes if notes else ''}

Best regards,
{company_name}"""

            # Generate PDF attachment if quotation data is provided
            attachments = []
            temp_file_path = None
            if quotation_data:
                try:
                    # Use the existing quote print template to generate PDF
                    pdf_path = await self._generate_pdf_from_template(quotation_data)
                    if pdf_path:
                        attachments.append(pdf_path)
                        temp_file_path = pdf_path
                        logger.info(f"PDF attachment generated for quotation {quotation_number}")
                except Exception as e:
                    logger.warning(f"Failed to generate PDF attachment: {str(e)}")
                    # Continue without PDF attachment

            # Create message
            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body,
                subtype="plain",
                attachments=attachments if attachments else []
            )

            # Send email
            await self.fastmail.send_message(message)
            logger.info(f"Quotation email sent successfully to {to_email}")
            
            # Clean up temporary file if it was created
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temporary PDF file: {temp_file_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary file {temp_file_path}: {str(e)}")
            
            return True

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to send quotation email to {to_email}: {error_msg}")
            
            # Clean up temporary file if it was created
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temporary PDF file after error: {temp_file_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up temporary file {temp_file_path}: {str(cleanup_error)}")
            
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
            
            # Generate PDF using pdfkit (wkhtmltopdf)
            try:
                # Create PDF using pdfkit
                pdf_path = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                pdf_path.close()
                
                # Configure pdfkit options
                options = {
                    'page-size': 'A4',
                    'margin-top': '0.75in',
                    'margin-right': '0.75in',
                    'margin-bottom': '0.75in',
                    'margin-left': '0.75in',
                    'encoding': "UTF-8",
                    'enable-local-file-access': None,
                    # Harden against external/network resource failures
                    'load-error-handling': 'ignore',
                    'load-media-error-handling': 'ignore',
                    'no-stop-slow-scripts': None,
                    'quiet': None,
                    'disable-external-links': None,
                }
                
                # Convert HTML to PDF
                pdfkit.from_string(html_content, pdf_path.name, options=options)
                
                logger.info(f"Generated PDF quote with pdfkit: {pdf_path.name}")
                
                # Clean up the data file
                os.unlink(temp_data_file.name)
                
                return pdf_path.name
                
            except Exception as pdf_error:
                logger.error(f"Failed to generate PDF with pdfkit: {str(pdf_error)}")
                # Fallback to ReportLab
                try:
                    pdf_path = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                    pdf_path.close()
                    
                    self._generate_pdf_with_reportlab(quotation_data, pdf_path.name)
                    
                    logger.info(f"Fallback: Generated PDF with ReportLab: {pdf_path.name}")
                    
                    # Clean up the data file
                    os.unlink(temp_data_file.name)
                    
                    return pdf_path.name
                    
                except Exception as reportlab_error:
                    logger.error(f"ReportLab fallback also failed: {str(reportlab_error)}")
                    # Final fallback to HTML file
                    temp_html_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.html')
                    temp_html_file.write(html_content)
                    temp_html_file.close()
                    
                    logger.info(f"Final fallback: Generated HTML quote template: {temp_html_file.name}")
                    
                    # Clean up the data file
                    os.unlink(temp_data_file.name)
                    
                    return temp_html_file.name
            
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
        line_items = quotation_data.get('line_items', [])
        totals = quotation_data.get('totals', {})
        quotation_number = quotation_data.get('quotation_number', 'N/A')
        date = quotation_data.get('date', 'N/A')
        valid_until = quotation_data.get('valid_until', 'N/A')
        notes = quotation_data.get('notes', '')
        
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
                
                .print-document {{
                    width: 100%;
                    position: relative;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }}

                .page-container {{
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }}
                
                .page {{
                    width: 210mm;
                    min-height: 297mm;
                    box-sizing: border-box;
                    padding: 20mm 14mm 50mm 14mm; /* increased bottom padding to avoid footer overlap */
                    background: white;
                    position: relative;
                    box-shadow: 0 0 5px rgba(0,0,0,0.1);
                    margin-bottom: 10px;
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
                
                /* Meta Information */
                .meta-grid {{
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 15px;
                    font-size: 12px; /* Increased from 11px */
                }}
                
                .meta-item {{
                    display: flex;
                    flex-direction: column;
                }}
                
                .meta-label {{
                    font-weight: bold;
                    margin-bottom: 4px; /* Increased spacing */
                }}
                
                .additional-meta {{
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 15px;
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
                
                /* Totals Section */
                .totals-section {{
                    margin-top: 25px;
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 30px;
                }}
                
                .totals-table {{
                    width: 250px; /* Wider for better spacing */
                    font-size: 13px; /* Increased from 12px */
                }}
                
                .totals-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 0; /* Increased padding */
                    border-bottom: 1px solid #eee;
                }}
                
                .totals-row.total-final {{
                    font-weight: bold;
                    font-size: 16px; /* Increased from 14px */
                    border-bottom: 2px solid #333;
                    border-top: 2px solid #333;
                    margin-top: 10px;
                    padding-top: 10px;
                    padding-bottom: 10px;
                }}
                
                .payment-term-section {{
                    margin: 8px 0;
                    font-size: 12px; /* Increased from 11px */
                    font-weight: bold;
                    padding: 6px 0;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                }}
                
                /* Footer - Fixed to Bottom */
                .footer {{
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 30mm;
                    padding: 4mm 14mm 4mm 14mm;
                    background: white;
                    border-top: 1px solid #ddd;
                    font-size: 11px; /* Increased from 10px */
                    line-height: 1.4;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    z-index: 10;
                }}
                
                .footer-left, .footer-right {{
                    width: 48%;
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
                
                /* Page Number */
                .page-number {{
                    position: fixed;
                    bottom: 8mm;
                    right: 14mm;
                    font-size: 11px; /* Increased from 10px */
                    z-index: 11;
                }}
                
                /* Print Styles */
                @media print {{
                    body {{ 
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        margin: 0;
                        padding: 0;
                    }}
                    .print-document {{ 
                        width: auto !important;
                        min-height: auto !important;
                        display: block;
                    }}
                    .page-container {{
                        display: block;
                        width: auto;
                    }}
                    .page {{
                        margin: 0;
                        box-shadow: none;
                        page-break-after: auto; /* Changed from always to auto */
                        min-height: auto; /* Allow content to determine height */
                        overflow: visible;
                    }}
                    .no-print {{ display: none !important; }}
                    .footer, .page-number {{
                        position: fixed;
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
                            <img 
                                src="{company_settings.get('logo_url', '')}" 
                                alt="Company Logo" 
                                class="company-logo" 
                            />
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
            discount_value = 0  # You can add discount logic here
            discounted_price = item.get('unit_price', 0) * (1 - discount_value / 100)
            
            # Get product details similar to frontend
            display_name = item.get('product_name_snapshot', item.get('description', ''))
            display_sku = item.get('product_code_snapshot', item.get('sku', ''))
            
            html += f"""
                                <tr>
                                    <td class=\"serial-col\">{idx}</td>
                                    <td class="desc-col">
                                        <div>
                                            <div style="font-weight: bold; margin-bottom: 2px;">{display_name}</div>
                                            <div style="font-size: 10px; color: #666;">{display_sku}</div>
                                        </div>
                                    </td>
                                    <td class=\"qty-col\">{item.get('quantity', 0):.3f}</td>
                                    <td class="tax-col">VAT at {quotation_data.get('vat_rate', 4)}%</td>
                                    <td class="price-col">{format_currency(item.get('unit_price', 0))}</td>
                                    <td class="disc-col">{discount_value}%</td>
                                    <td class="price-col">{format_currency(discounted_price)}</td>
                                    <td class="total-col">{format_currency(total_price * (1 - discount_value / 100))}</td>
                                </tr>
            """
        
        html += f"""
                            </tbody>
                        </table>

                        <!-- Totals Section -->
                        <div class="totals-section">
                            <div class="totals-table">
                                <div class="totals-row">
                                    <span>Total Without VAT</span>
                                    <span>{format_currency((totals.get('subtotal', 0) - totals.get('discountAmount', 0)))}</span>
                                </div>
                                
                                <div class="totals-row">
                                    <span>Discount</span>
                                    <span>-{format_currency(totals.get('discountAmount', 0))}</span>
                                </div>
                                
                                <div class="payment-term-section">
                                    <span>Payment Term</span>
                                    <span>Prepaid</span>
                                </div>
                                
                                <div class="totals-row">
                                    <span>VAT ({quotation_data.get('vat_rate', 4)}%)</span>
                                    <span>{format_currency(totals.get('vatAmount', totals.get('taxAmount', 0)))}</span>
                                </div>
                                
                                <div class="totals-row total-final">
                                    <span>Total</span>
                                    <span>{format_currency(totals.get('total', 0))}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Notes Section -->
        """
        
        if notes:
            html += f"""
                        <div class="notes-section" style="margin-top: 20px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
                            <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Additional Notes:</div>
                            <div style="font-size: 12px; line-height: 1.5; white-space: pre-wrap;">{notes}</div>
                        </div>
            """
        
        html += f"""
                    </div>
                </div>

                <!-- Footer - Fixed to Bottom -->
                <div class="footer">
                    <div class="footer-left">
                        <div class="company-name">{company_settings.get('company_name', '')}</div>
                        {f"<div>{address_html}</div>" if address_html else ''}
                        {f"<div>{company_email}</div>" if company_email else ''}
                        {f"<div>{company_website}</div>" if company_website else ''}
                        {f"<div>VAT {vat_number}</div>" if vat_number else ''}
                    </div>
                    
                    <div class="footer-right">
                        <div class="bank-title">Bank Details:</div>
                        {f"<div>{bank_name_branch}</div>" if bank_name_branch else ''}
                        {f"<div>{bank_address_html}</div>" if bank_address_html else ''}
                        {f"<div>Account No.: {bank_account_number}</div>" if bank_account_number else ''}
                        {f"<div>IBAN-code: {bank_iban}</div>" if bank_iban else ''}
                        {f"<div>BIC/Swift: {bank_bic_swift}</div>" if bank_bic_swift else ''}
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
