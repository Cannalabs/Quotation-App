
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
    const defaultVatRate = company_settings?.default_vat_rate || 4;
    
    // Split items: first page gets 13 items, second page gets 12 items, rest get 25 items
    const firstPageItems = 13;
    const secondPageItems = 12;
    const subsequentPageItems = 25;
    const itemPages = [];
    
    if (items.length > 0) {
      // First page: 13 items
      itemPages.push(items.slice(0, firstPageItems));
      
      // Second page: 12 items only
      if (items.length > firstPageItems) {
        itemPages.push(items.slice(firstPageItems, firstPageItems + secondPageItems));
        
        // Subsequent pages: 25 items each (starting from item 26)
        for (let i = firstPageItems + secondPageItems; i < items.length; i += subsequentPageItems) {
          itemPages.push(items.slice(i, i + subsequentPageItems));
        }
      }
    }
    
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');
          
          /* Page Setup */
          @page { 
            size: A4; 
            margin: 0;
            margin-bottom: 0; /* Footer is inside page, no margin needed */
          }
          
          @page :first {
            margin-bottom: 0;
          }
          
          @page :left {
            margin-bottom: 0; 
          }
          
          @page :right {
            margin-bottom: 0;
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
            background: white;
          }

          .page-container {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            background: white;
          }
          
          .page-wrapper {
            position: relative;
            width: 210mm;
            margin-bottom: 10px;
            min-height: 297mm;
            height: 297mm; /* Fixed height for A4 */
            background: white;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: always;
            break-after: page;
          }
          
          .page-wrapper:last-child {
            page-break-after: auto;
          }
          
          .page {
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            padding: 20mm 14mm 25mm 14mm; /* Increased bottom padding for footer space */
            background: white;
            position: relative;
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
            margin: 0 auto; /* Center the page */
            display: inline-block;
            text-align: left; /* Reset text-align inside page - content should be left-aligned */
            page-break-after: auto;
            page-break-inside: auto; /* Allow content to flow, but footer stays on page */
            overflow: visible;
          }

          .page-header {
            display: table;
            width: 100%;
            margin-bottom: 20px;
            table-layout: fixed;
          }
          
          .header-left {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 20px;
          }
          
          .header-right {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            text-align: right;
            padding-left: 20px;
          }
          
          .company-logo-section {
            margin-bottom: 0;
          }
          
          .company-logo {
            max-width: 120px;
            max-height: 60px;
            object-fit: contain;
          }
          
          .company-header-info {
            font-size: 11px;
            line-height: 1.6;
            color: #333;
          }
          
          .company-header-info .company-name {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 6px;
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
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .meta-item {
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
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
            page-break-inside: avoid;
            break-inside: avoid;
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
          
          .quote-table thead tr {
            page-break-inside: avoid;
            page-break-after: avoid;
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
          
          .quote-table tbody tr {
            page-break-inside: avoid;
            page-break-after: auto;
            break-inside: avoid;
            display: table-row;
          }
          
          .quote-table tbody tr:last-child {
            page-break-after: auto;
          }
          
          /* Ensure table rows don't break across pages */
          .quote-table tbody tr td {
            page-break-inside: avoid;
          }
          
          .serial-col { width: 35px; text-align: right; }
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
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .totals-table {
            page-break-inside: avoid;
            break-inside: avoid;
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
          
          .notes-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 30px;
            min-height: fit-content;
            page-break-after: avoid;
            break-after: avoid;
          }
          
          .page-with-notes {
            padding-bottom: 30mm !important; /* Extra space for notes section */
          }
          
          /* Footer - Fixed to Bottom - Repeats on every page */
          .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 15mm;
            padding: 3mm 14mm;
            background: white;
            border-top: 1px solid #ddd;
            font-size: 10px;
            line-height: 1.3;
            box-sizing: border-box;
            display: table;
            table-layout: fixed;
            z-index: 1000;
            page-break-inside: avoid;
            page-break-before: avoid;
            page-break-after: avoid;
            break-inside: avoid;
            break-before: avoid;
            break-after: avoid;
            visibility: visible !important;
            opacity: 1 !important;
            color: #333 !important;
          }
          
          .footer-center {
            display: table-cell;
            width: 100%;
            vertical-align: middle;
            text-align: center;
          }
          
          .bank-info-compact {
            text-align: center;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
          }
          
          /* Page Number - Fixed to repeat on every page */
          .page-number {
            position: absolute;
            bottom: 8mm;
            right: 14mm;
            font-size: 11px;
            z-index: 11;
            color: #333;
            white-space: nowrap;
            display: block;
            visibility: visible;
            opacity: 1;
            text-align: right;
            page-break-after: avoid;
          }
          
          /* Ensure pages break properly */
          .page-wrapper {
            page-break-after: always;
            position: relative;
            background: white;
          }
          
          .page-wrapper:last-child {
            page-break-after: auto;
          }
          
          .page {
            page-break-after: auto;
            background: white;
          }
          
          /* Print Styles */
          @media print {
            html, body { 
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-document { 
              width: auto !important;
              min-height: auto !important;
              display: block !important;
              background: white !important;
            }
            .page-container {
                display: block !important;
                width: auto !important;
                background: white !important;
            }
            .page-wrapper {
                page-break-after: always !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                position: relative !important;
                background: white !important;
                height: 297mm !important;
                min-height: 297mm !important;
            }
            .page-wrapper:last-child {
                page-break-after: auto !important;
            }
            .page {
                margin: 0 !important;
                box-shadow: none !important;
                page-break-after: auto !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                overflow: hidden !important;
                padding-bottom: 25mm !important; /* Space for footer */
                page-break-inside: avoid !important; /* Keep footer on same page */
                break-inside: avoid !important;
                background: white !important;
                position: relative !important;
              }
              .page-with-notes {
                padding-bottom: 30mm !important; /* Extra space for notes section */
                position: relative !important;
            }
            .footer {
                position: absolute !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                height: 15mm !important;
                padding: 3mm 14mm !important;
                background: white !important;
                border-top: 1px solid #ddd !important;
                display: table !important;
                table-layout: fixed !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 1000 !important;
                page-break-inside: avoid !important;
                page-break-before: avoid !important;
                page-break-after: avoid !important;
                break-inside: avoid !important;
                break-before: avoid !important;
                break-after: avoid !important;
                color: #333 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .footer-center {
                display: table-cell !important;
                width: 100% !important;
                vertical-align: middle !important;
                text-align: center !important;
            }
            .bank-info-compact {
                text-align: center !important;
                font-size: 10px !important;
                color: #333 !important;
            }
            .page-number {
                position: absolute !important;
                bottom: 8mm !important;
                right: 14mm !important;
                font-size: 11px !important;
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 1001 !important;
                color: #333 !important;
                page-break-after: avoid !important;
            }
            .no-print { display: none !important; }
            .quote-table {
              page-break-inside: auto !important;
            }
            .quote-table thead {
              display: table-header-group !important;
            }
            .quote-table tbody tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: auto !important;
            }
            .quote-table tbody tr td {
              page-break-inside: avoid !important;
            }
            .totals-section {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .totals-table {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>

        <div className="print-document">
          
          <div className="page-container">
            {itemPages.map((pageItems, pageIndex) => {
              const isFirstPage = pageIndex === 0;
              const isLastPage = pageIndex === itemPages.length - 1;
              // Calculate start item number based on actual items per page
              let startItemNumber = 1;
              if (pageIndex === 1) {
                // Second page starts after first page items
                startItemNumber = firstPageItems + 1;
              } else if (pageIndex > 1) {
                // Third page and beyond: first page (13) + second page (12) + subsequent pages
                startItemNumber = firstPageItems + secondPageItems + (pageIndex - 2) * subsequentPageItems + 1;
              }
              
            return (
              <div key={pageIndex} className="page-wrapper">
                <div className={`page ${isLastPage && notes ? 'page-with-notes' : ''}`} style={isLastPage && notes ? { paddingBottom: '30mm' } : {}}>
                  {/* Header with Logo and Company Address - only on first page */}
                  {isFirstPage && (
                    <>
                      <div className="page-header">
                        <div className="header-left">
                          <div className="company-logo-section">
                            <img 
                              src={getLogoUrl()} 
                              alt="Company Logo" 
                              className="company-logo" 
                            />
                          </div>
                        </div>
                        <div className="header-right">
                          <div className="company-header-info">
                            <div className="company-name">{company_settings?.company_name || 'Grow United Italia SRL'}</div>
                            <div>
                              {company_settings?.address_line1 && <div>{company_settings.address_line1}</div>}
                              {company_settings?.address_line2 && <div>{company_settings.address_line2}</div>}
                              {(() => {
                                const city = company_settings?.city;
                                const postal = company_settings?.postal_code;
                                const country = company_settings?.country;
                                const cityPostalCountry = [city, postal, country].filter(Boolean).join(', ');
                                if (cityPostalCountry) {
                                  return <div>{cityPostalCountry}</div>;
                                }
                                return null;
                              })()}
                              {!company_settings?.address_line1 && !company_settings?.city && (
                                <>
                                  <div>Via Paleocapa 1</div>
                                  <div>Milano, 20121, Italy</div>
                                </>
                              )}
                            </div>
                            <div>{company_settings?.email || 'administration@growunited.it'}</div>
                            <div>{company_settings?.website || 'www.canna-it.com'}</div>
                            <div>IVA {company_settings?.vat_number || 'IT13328670966'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Main Title - only on first page */}
                      <div className="quotation-title">Quotation No. {quoteData.quotation_number}</div>

                      {/* Meta Information - only on first page */}
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
                          <div className="meta-value">ORDER No. {quoteData.quotation_number}</div>
                        </div>
                        <div className="meta-item">
                          <div className="meta-label">Discount:</div>
                          <div className="meta-value">
                            {formatCurrency(totals?.discountAmount || 0)} of {formatCurrency(totals?.subtotal || 0)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Items Table */}
                  <table className="quote-table">
                    <thead>
                      <tr>
                        <th className="serial-col">S.No.</th>
                        <th className="desc-col">Description</th>
                        <th className="qty-col">Quantity</th>
                        <th className="tax-col">VAT</th>
                        <th className="price-col">Sale Price</th>
                        <th className="disc-col">Discount (%)</th>
                        <th className="price-col">Price</th>
                        <th className="total-col">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item, index) => {
                        const totalPrice = item.quantity * item.unit_price;
                        const discountValue = discount?.type === 'percentage' ? discount.value : 0;
                        const discountedPrice = item.unit_price * (1 - discountValue / 100);
                        
                        const displayName = item.product_name_snapshot || item.product_name;
                        const displaySku = item.product_code_snapshot || item.sku;
                        const itemVatRate = item.vat_rate != null ? item.vat_rate : defaultVatRate;
                        const itemNumber = startItemNumber + index;

                        return (
                          <tr key={index}>
                            <td className="serial-col">{itemNumber}</td>
                            <td className="desc-col">
                              <div>
                                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{displayName}</div>
                                <div style={{ fontSize: '10px', color: '#666' }}>{displaySku}</div>
                              </div>
                            </td>
                            <td className="qty-col">{item.quantity.toFixed(3)}</td>
                            <td className="tax-col">VAT at {itemVatRate}%</td>
                            <td className="price-col">{formatCurrency(item.unit_price)}</td>
                            <td className="disc-col">{discountValue}%</td>
                            <td className="price-col">{formatCurrency(discountedPrice)}</td>
                            <td className="total-col">{formatCurrency(totalPrice * (1 - discountValue / 100))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Totals Section - only on last page */}
                  {isLastPage && (
                    <>
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
                            <span>Total VAT</span>
                            <span>{formatCurrency(totals?.vatAmount || totals?.taxAmount || 0)}</span>
                          </div>
                          
                          <div className="totals-row total-final">
                            <span>Total</span>
                            <span>{formatCurrency(totals?.total || 0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes Section - only on last page */}
                      {notes && (
                        <div className="notes-section" style={{ 
                          marginTop: '20px', 
                          marginBottom: '50px',
                          padding: '15px', 
                          background: '#f9f9f9', 
                          border: '1px solid #ddd', 
                          borderRadius: '8px',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          pageBreakAfter: 'avoid',
                          breakAfter: 'avoid'
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Additional Notes:</div>
                          <div style={{ fontSize: '12px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{notes}</div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Extra spacing before footer on last page if notes are present */}
                  {isLastPage && notes && (
                    <div style={{ height: '20px', pageBreakInside: 'avoid', pageBreakAfter: 'avoid' }}></div>
                  )}
                  
                  {/* Footer - Fixed to bottom of each page */}
                  <div className="footer">
                    <div className="footer-center">
                      <div className="bank-info-compact">
                        <strong>Bank Details:</strong> {company_settings?.bank_name_branch || 'BANCA PASSADORE & C. S.P.A. - CORSO MATTEOTTI, 7 - MILANO 20121'} | 
                        Account nr.: {company_settings?.account_number || '1118520'} | 
                        IBAN: {company_settings?.iban || 'IT87I0333201600000001118520'} | 
                        BIC/Swift: {company_settings?.bic_swift || 'PASBITGG'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Page Number - Fixed to bottom of each page */}
                  <div className="page-number">
                    Page: {pageIndex + 1} / {itemPages.length}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
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
