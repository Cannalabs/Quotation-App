from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class PDFService:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Setup custom paragraph styles for the quotation PDF"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='QuotationTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        ))
        
        # Company info style
        self.styles.add(ParagraphStyle(
            name='CompanyInfo',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_LEFT
        ))
        
        # Customer info style
        self.styles.add(ParagraphStyle(
            name='CustomerInfo',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_LEFT
        ))
        
        # Table header style
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.white
        ))
        
        # Table data style
        self.styles.add(ParagraphStyle(
            name='TableData',
            parent=self.styles['Normal'],
            fontSize=9,
            alignment=TA_LEFT
        ))
        
        # Total style
        self.styles.add(ParagraphStyle(
            name='Total',
            parent=self.styles['Normal'],
            fontSize=12,
            alignment=TA_RIGHT,
            textColor=colors.darkblue,
            spaceBefore=10
        ))

    def generate_quotation_pdf(self, quotation_data: Dict[str, Any]) -> BytesIO:
        """
        Generate a PDF for the quotation
        """
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
            
            # Build the PDF content
            story = []
            
            # Title
            story.append(Paragraph("QUOTATION", self.styles['QuotationTitle']))
            story.append(Spacer(1, 12))
            
            # Company and Customer info side by side
            company_info = self._format_company_info(quotation_data.get('company_settings', {}))
            customer_info = self._format_customer_info(quotation_data.get('customer', {}))
            
            # Create a table for company and customer info
            info_data = [
                [company_info, customer_info]
            ]
            
            info_table = Table(info_data, colWidths=[3*inch, 3*inch])
            info_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]))
            
            story.append(info_table)
            story.append(Spacer(1, 20))
            
            # Quotation details
            story.append(Paragraph(f"<b>Quotation Number:</b> {quotation_data.get('quotation_number', 'N/A')}", self.styles['Normal']))
            story.append(Paragraph(f"<b>Date:</b> {quotation_data.get('date', 'N/A')}", self.styles['Normal']))
            story.append(Paragraph(f"<b>Valid Until:</b> {quotation_data.get('valid_until', 'N/A')}", self.styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Items table
            if quotation_data.get('line_items'):
                story.append(Paragraph("Items:", self.styles['Heading2']))
                story.append(Spacer(1, 10))
                
                # Table headers
                table_data = [['Description', 'Quantity', 'Unit Price', 'Total']]
                
                # Add items
                for item in quotation_data['line_items']:
                    table_data.append([
                        item.get('description', ''),
                        str(item.get('quantity', 0)),
                        f"€{item.get('unit_price', 0):.2f}",
                        f"€{item.get('total', 0):.2f}"
                    ])
                
                # Create table
                items_table = Table(table_data, colWidths=[3*inch, 1*inch, 1.5*inch, 1.5*inch])
                items_table.setStyle(TableStyle([
                    # Header row
                    ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    
                    # Data rows
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                
                story.append(items_table)
                story.append(Spacer(1, 20))
            
            # Totals
            totals = quotation_data.get('totals', {})
            if totals:
                story.append(Paragraph(f"<b>Subtotal:</b> €{totals.get('subtotal', 0):.2f}", self.styles['Total']))
                if totals.get('discount_amount', 0) > 0:
                    story.append(Paragraph(f"<b>Discount:</b> -€{totals.get('discount_amount', 0):.2f}", self.styles['Total']))
                if totals.get('vat_amount', 0) > 0:
                    story.append(Paragraph(f"<b>VAT ({totals.get('vat_rate', 0):.1f}%):</b> €{totals.get('vat_amount', 0):.2f}", self.styles['Total']))
                story.append(Paragraph(f"<b>TOTAL:</b> €{totals.get('total', 0):.2f}", self.styles['Total']))
                story.append(Spacer(1, 20))
            
            # Terms and conditions
            if quotation_data.get('terms_and_conditions'):
                story.append(Paragraph("Terms and Conditions:", self.styles['Heading2']))
                story.append(Paragraph(quotation_data['terms_and_conditions'], self.styles['Normal']))
                story.append(Spacer(1, 20))
            
            # Notes
            if quotation_data.get('notes'):
                story.append(Paragraph("Notes:", self.styles['Heading2']))
                story.append(Paragraph(quotation_data['notes'], self.styles['Normal']))
            
            # Build PDF
            doc.build(story)
            buffer.seek(0)
            
            logger.info(f"PDF generated successfully for quotation {quotation_data.get('quotation_number', 'N/A')}")
            return buffer
            
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}")
            raise Exception(f"Failed to generate PDF: {str(e)}")

    def _format_company_info(self, company_settings: Dict[str, Any]) -> str:
        """Format company information for PDF"""
        info = f"<b>{company_settings.get('company_name', 'Your Company')}</b><br/>"
        if company_settings.get('address'):
            info += f"{company_settings['address']}<br/>"
        if company_settings.get('phone'):
            info += f"Phone: {company_settings['phone']}<br/>"
        if company_settings.get('email'):
            info += f"Email: {company_settings['email']}<br/>"
        if company_settings.get('vat_number'):
            info += f"VAT: {company_settings['vat_number']}<br/>"
        if company_settings.get('website'):
            info += f"Web: {company_settings['website']}"
        return info

    def _format_customer_info(self, customer: Dict[str, Any]) -> str:
        """Format customer information for PDF"""
        info = f"<b>Bill To:</b><br/>"
        info += f"{customer.get('company_name', '')}<br/>"
        if customer.get('contact_person'):
            info += f"Attn: {customer['contact_person']}<br/>"
        if customer.get('address'):
            info += f"{customer['address']}<br/>"
        if customer.get('phone'):
            info += f"Phone: {customer['phone']}<br/>"
        if customer.get('email'):
            info += f"Email: {customer['email']}"
        return info

# Global PDF service instance
pdf_service = PDFService()
