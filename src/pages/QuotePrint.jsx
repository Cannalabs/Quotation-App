
import React, { useEffect, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { User } from "@/api/entities";
import { AlertCircle, Loader2, FileText } from "lucide-react";
import { useCompanySettings } from "@/contexts/CompanySettingsContext";

export default function QuotePrint() {
  const [status, setStatus] = useState('loading');
  const [quoteData, setQuoteData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const { getLogoUrl, companySettings } = useCompanySettings();

  useEffect(() => {
    const loadData = async () => {
      try {
        const dataString = localStorage.getItem('tempQuoteData');
        if (!dataString) {
          throw new Error("No quote data found. Please generate the PDF from the quote page.");
        }
        const parsedData = JSON.parse(dataString);
        if (!parsedData || !parsedData.quotation_number) {
          throw new Error("Invalid quote data. Please regenerate the PDF.");
        }
        setQuoteData(parsedData);
        document.title = `Quotation_${parsedData.quotation_number.replace(/[\/\\]/g, '_')}`;
        setStatus('success');
      } catch (err) {
        setErrorMessage(err.message);
        setStatus('error');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (status === 'success') {
      setTimeout(() => window.print(), 1000);
    }
  }, [status]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'dd/MM/yyyy HH:mm:ss') : '';
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount || 0);
  };
  
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center text-slate-600">
          <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-purple-600" />
          <p className="text-lg font-medium">Generating Your Quotation...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
        <div className="text-center text-red-700 max-w-md p-8 bg-white shadow-2xl rounded-2xl border border-red-200">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">PDF Generation Failed</h2>
          <p className="text-slate-600 mb-6">{errorMessage}</p>
          <button 
            onClick={() => window.close()} 
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success' && quoteData) {
    const { company_settings, customer, items, totals, currency = 'EUR', discount, notes } = quoteData;
    
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');
          
          /* Page Setup */
          @page { 
            size: A4; 
            margin: 0;
          }
          
          body { 
            background: white;
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif;
            font-size: 12px; /* Increased from 11px */
            line-height: 1.6; /* Increased for better readability */
            color: #333; /* Slightly darker text */
          }
          
          .print-document {
            width: 100%;
            position: relative;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .page-container {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .page {
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            padding: 20mm 14mm 32mm 14mm;
            background: white;
            position: relative;
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
            margin-bottom: 10px;
          }

          .page-header {
            margin-bottom: 15px;
          }
          
          .company-logo-section {
            margin-bottom: 15px;
          }
          
          .company-logo {
            max-width: 120px;
            max-height: 60px;
            object-fit: contain;
          }
          
          /* Quotation Title */
          .quotation-title {
            font-size: 20px; /* Increased from 18px */
            font-weight: bold;
            text-align: center;
            margin: 25px 0 20px 0;
            color: #111;
          }
          
          /* Meta Information */
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 12px; /* Increased from 11px */
          }
          
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          
          .meta-label {
            font-weight: bold;
            margin-bottom: 4px; /* Increased spacing */
          }
          
          .additional-meta {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 25px;
            font-size: 12px; /* Increased from 11px */
          }
          
          /* Table Styles */
          .quote-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px; /* Increased from 10px */
            margin-bottom: 20px;
            page-break-inside: auto;
          }
          
          .quote-table thead {
            display: table-header-group;
          }
          
          .quote-table th {
            background-color: #f5f5f5; /* Slightly darker grey */
            border: 1px solid #ddd; /* Slightly darker border */
            padding: 10px 6px; /* Increased padding */
            text-align: center;
            font-weight: bold;
            font-size: 11px;
            color: #222;
          }
          
          .quote-table td {
            border: 1px solid #e5e5e5;
            padding: 8px 6px; /* Increased padding */
            font-size: 11px;
            vertical-align: top;
          }
          
          .quote-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .qty-col { width: 45px; text-align: right; }
          .desc-col { width: 180px; text-align: left; }
          .tax-col { width: 80px; text-align: center; }
          .price-col { width: 55px; text-align: right; }
          .disc-col { width: 45px; text-align: right; }
          .total-col { width: 55px; text-align: right; }
          
          /* Totals Section */
          .totals-section {
            margin-top: 25px;
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          
          .totals-table {
            width: 250px; /* Wider for better spacing */
            font-size: 13px; /* Increased from 12px */
          }
          
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0; /* Increased padding */
            border-bottom: 1px solid #eee;
          }
          
          .totals-row.total-final {
            font-weight: bold;
            font-size: 16px; /* Increased from 14px */
            border-bottom: 2px solid #333;
            border-top: 2px solid #333;
            margin-top: 10px;
            padding-top: 10px;
            padding-bottom: 10px;
          }
          
          .payment-term-section {
            margin: 8px 0;
            font-size: 12px; /* Increased from 11px */
            font-weight: bold;
            padding: 6px 0;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
          }
          
          /* Footer - Fixed to Bottom */
          .footer {
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
          }
          
          .footer-left, .footer-right {
            width: 48%;
          }
          
          .footer .company-name {
            font-weight: bold;
            margin-bottom: 3px;
            font-size: 12px; /* Increased from 11px */
          }
          
          .footer .bank-title {
            font-weight: bold;
            margin-bottom: 3px;
          }
          
          /* Page Number */
          .page-number {
            position: fixed;
            bottom: 8mm;
            right: 14mm;
            font-size: 11px; /* Increased from 10px */
            z-index: 11;
          }
          
          /* Print Styles */
          @media print {
            body { 
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0;
              padding: 0;
            }
            .print-document { 
              width: auto !important;
              min-height: auto !important;
              display: block;
            }
            .page-container {
                display: block;
                width: auto;
            }
            .page {
                margin: 0;
                box-shadow: none;
                page-break-after: auto; /* Changed from always to auto */
                min-height: auto; /* Allow content to determine height */
                overflow: visible;
            }
            .no-print { display: none !important; }
            .footer, .page-number {
              position: fixed;
            }
          }
        `}</style>

        <div className="print-document">
          
          <div className="page-container">
            {/* Page 1 */}
            <div className="page">
              <div className="page-header"></div>

              {/* Company Logo Section */}
              <div className="company-logo-section">
                <img 
                  src={getLogoUrl()} 
                  alt="Company Logo" 
                  className="company-logo" 
                />
              </div>

              {/* Main Title */}
              <div className="quotation-title">Quotation N° {quoteData.quotation_number}</div>

              {/* Meta Information */}
              <div className="meta-grid">
                <div className="meta-item">
                  <div className="meta-label">Quotation Date:</div>
                  <div className="meta-value">{formatDate(quoteData.date)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Delivery Date:</div>
                  <div className="meta-value">{formatDate(quoteData.valid_until)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Payment Term:</div>
                  <div className="meta-value">Prepaid</div>
                </div>
              </div>

              <div className="additional-meta">
                <div className="meta-item">
                  <div className="meta-label">Order Contact:</div>
                  <div className="meta-value">{customer?.company_name}, {customer?.contact_person}</div>
                  <div className="meta-value">{customer?.address}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Your Reference:</div>
                  <div className="meta-value">ORDINE N {quoteData.quotation_number}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Discount:</div>
                  <div className="meta-value">
                    {formatCurrency(totals?.discountAmount || 0)} of {formatCurrency(totals?.subtotal || 0)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="quote-table">
                <thead>
                  <tr>
                    <th className="qty-col">Quantity</th>
                    <th className="desc-col">Description</th>
                    <th className="tax-col">VAT</th>
                    <th className="price-col">Sale Price</th>
                    <th className="disc-col">Disc.(%)</th>
                    <th className="price-col">Price</th>
                    <th className="total-col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item, index) => {
                    const totalPrice = item.quantity * item.unit_price;
                    const discountValue = discount?.type === 'percentage' ? discount.value : 0;
                    const discountedPrice = item.unit_price * (1 - discountValue / 100);
                    
                    const displayName = item.product_name_snapshot || item.product_name;
                    const displaySku = item.product_code_snapshot || item.sku;

                    return (
                      <tr key={index}>
                        <td className="qty-col">{item.quantity.toFixed(3)}</td>
                        <td className="desc-col">
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{displayName}</div>
                            <div style={{ fontSize: '10px', color: '#666' }}>{displaySku}</div>
                          </div>
                        </td>
                        <td className="tax-col">VAT al {quoteData.vat_rate || 4}% (debito)</td>
                        <td className="price-col">{formatCurrency(item.unit_price)}</td>
                        <td className="disc-col">{discountValue}%</td>
                        <td className="price-col">{formatCurrency(discountedPrice)}</td>
                        <td className="total-col">{formatCurrency(totalPrice * (1 - discountValue / 100))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="totals-section">
                <div className="totals-table">
                  <div className="totals-row">
                    <span>Total Without VAT</span>
                    <span>{formatCurrency((totals?.subtotal || 0) - (totals?.discountAmount || 0))}</span>
                  </div>
                  
                  {/* Add Discount Total */}
                  <div className="totals-row">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals?.discountAmount || 0)}</span>
                  </div>
                  
                  <div className="payment-term-section">
                    <span>Payment Term</span>
                    <span>Prepaid</span>
                  </div>
                  
                  <div className="totals-row">
                    <span>VAT ({quoteData.vat_rate || 4}%)</span>
                    <span>{formatCurrency(totals?.vatAmount || totals?.taxAmount || 0)}</span>
                  </div>
                  
                  <div className="totals-row total-final">
                    <span>Total</span>
                    <span>{formatCurrency(totals?.total || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {notes && (
                <div className="notes-section" style={{ marginTop: '20px', padding: '15px', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Additional Notes:</div>
                  <div style={{ fontSize: '12px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Fixed to Bottom */}
          <div className="footer">
            <div className="footer-left">
              <div className="company-name">{company_settings?.company_name || 'Grow United Italia SRL'}</div>
              <div>{company_settings?.address?.split('\n').join('\n') || 'Via Paleocapa 1\nMilano, 20121\nItaly'}</div>
              <div>{company_settings?.email || 'administration@growunited.it'}</div>
              <div>{company_settings?.website || 'www.canna-it.com'}</div>
              <div>IVA {company_settings?.vat_number || 'IT13328670966'}</div>
            </div>
            
            <div className="footer-right">
              <div className="bank-title">Bank Details:</div>
              <div>BANCA PASSADORE & C. S.P.A. - CORSO MATTEOTTI, 7 - MILANO 20121</div>
              <div>Account nr.: 1118520</div>
              <div>IBAN-code: IT87I0333201600000001118520</div>
              <div>BIC/Swift: PASBITGG</div>
            </div>
          </div>

          {/* Page Number */}
          <div className="page-number">Page: 1 / 1</div>
        </div>

        <div className="no-print" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          <button 
            onClick={() => window.print()}
            style={{ 
              display: 'block', 
              width: '200px', 
              padding: '12px', 
              backgroundColor: '#7c3aed', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              marginBottom: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Print / Save as PDF
          </button>
          <button 
            onClick={() => window.close()}
            style={{ 
              display: 'block', 
              width: '200px', 
              padding: '12px', 
              backgroundColor: '#6b7280', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close Preview
          </button>
        </div>
      </>
    );
  }

  return null;
}
