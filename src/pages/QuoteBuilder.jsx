
import React, { useState, useEffect } from "react";
import { Customer, Product, Quotation, CompanySettings, User } from "@/api/entities"; // Added User entity
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronLeft,
  FileText,
  User as UserIcon, // Renamed User import to UserIcon to avoid conflict with User entity
  Calendar,
  Package2,
  Save,
  Send,
  Download,
  Mail,
  AlertCircle,
  Check,
  Lock,
  Archive, // Added Archive icon
  RotateCcw, // Added RotateCcw icon
  Loader2, // Added Loader2 icon for loading state
  Edit3 // Added Edit3 icon for revert to draft
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

import CustomerSelector from "../components/quote_builder/CustomerSelector";
import ProductLineItems from "../components/quote_builder/ProductLineItems";
import QuotationSummary from "../components/quote_builder/QuotationSummary";
import QuotationNotes from "../components/quote_builder/QuotationNotes"; // New import

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [quotationData, setQuotationData] = useState({
    quotation_number: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    status: "draft",
    valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    terms_and_conditions: "Payment is due within 30 days from the date of the invoice. Late payments may incur additional charges."
  });
  const [lineItems, setLineItems] = useState([]);
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [quoteId, setQuoteId] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [originalQuoteData, setOriginalQuoteData] = useState(null); // State to store the original quote data for status history
  const [displayTotals, setDisplayTotals] = useState({ // State to hold calculated totals for rendering
    subtotal: 0,
    discountAmount: 0,
    taxableTotal: 0,
    vatAmount: 0,
    vatRate: 0,
    total: 0
  });
  const [isArchiving, setIsArchiving] = useState(false); // New state for archiving operations
  const [quotationNotes, setQuotationNotes] = useState(""); // New state for notes
  const [isSendingEmail, setIsSendingEmail] = useState(false); // New state for email sending
  const [isRevertingToDraft, setIsRevertingToDraft] = useState(false); // New state for revert to draft operation
  const [isEmailConfigured, setIsEmailConfigured] = useState(false); // New state for email configuration status

  const checkEmailConfiguration = async () => {
    try {
      const { getEmailConfigStatus } = await import('@/api/integrations');
      const configStatus = await getEmailConfigStatus();
      setIsEmailConfigured(configStatus.fully_configured || configStatus.is_configured);
    } catch (error) {
      console.error("Error checking email configuration:", error);
      setIsEmailConfigured(false);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    const productIdsParam = searchParams.get('products');

    if (id) {
      loadQuoteForEditing(id);
    } else {
      loadInitialData(productIdsParam);
    }
  }, [location.search]);

  // Check email configuration periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkEmailConfiguration();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Effect to recalculate totals for display whenever relevant dependencies change
  useEffect(() => {
    const updateDisplayTotals = async () => {
      const currentTotals = await calculateTotals();
      setDisplayTotals(currentTotals);
    };
    updateDisplayTotals();
  }, [lineItems, discountType, discountValue]); // Recalculate if line items or discount changes

  const loadQuoteForEditing = async (id) => {
    setIsLoading(true);
    try {
      const quote = await Quotation.get(id);
      setOriginalQuoteData(quote); // Store the original quote data
      setQuoteId(id); // Ensure quoteId state is set for existing quotes
      const [customersData, productsData] = await Promise.all([
      Customer.list("-created_date"),
      Product.list("-created_date")]
      );
      setCustomers(customersData);
      setProducts(productsData);
      checkEmailConfiguration();

      // Helper function to safely format date
      const formatDateForInput = (dateString) => {
        if (!dateString) return format(new Date(), 'yyyy-MM-dd');

        let date;
        if (typeof dateString === 'string') {
          date = parseISO(dateString);
          if (!isValid(date)) {
            // Fallback for non-ISO strings, try parsing directly
            date = new Date(dateString);
          }
        } else {
          // If it's already a Date object or number (timestamp)
          date = new Date(dateString);
        }

        if (!isValid(date)) {
          console.warn('Invalid date, using current date:', dateString);
          return format(new Date(), 'yyyy-MM-dd');
        }

        return format(date, 'yyyy-MM-dd');
      };

      setQuotationData({
        quotation_number: quote.quotation_number,
        date: formatDateForInput(quote.date),
        status: quote.status,
        valid_until: formatDateForInput(quote.valid_until),
        terms_and_conditions: quote.terms_and_conditions || ""
      });
      // Map the new API response structure to the expected customer object
      if (quote.customer_name || quote.customer_email) {
        setSelectedCustomer({
          company_name: quote.customer_name,
          contact_person: quote.customer_contact_person || quote.customer_name,
          email: quote.customer_email,
          phone: quote.customer_phone || "",
          address: quote.customer_address || "",
          vat_number: quote.customer_vat_number || ""
        });
      } else {
        setSelectedCustomer(null);
      }

      // Ensure line items have proper product names and IDs
      const enhancedLineItems = quote.items.map((item) => {
        // Use snapshot data if available, otherwise use current item data
        const productName = item.product_name_snapshot || item.product_name || item.name;
        const productSku = item.product_code_snapshot || item.sku;
        const productId = item.product_id;

        return {
          ...item,
          id: productId,
          name: productName,
          sku: productSku,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0
        };
      });

      setLineItems(enhancedLineItems);
      setQuotationNotes(quote.notes || ""); // Populate notes
      setDiscountType(quote.discount_type || "none");
      setDiscountValue(quote.discount_value || 0);
      setIsConfirmed(quote.status !== 'draft');
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load quote for editing." });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInitialData = async (productIdsParam) => {
    setIsLoading(true);
    try {
      const [customersData, productsData] = await Promise.all([
      Customer.list("-created_date"),
      Product.list("-created_date")]
      );
      setCustomers(customersData);
      setProducts(productsData);
      checkEmailConfiguration();

      if (productIdsParam) {
        const productIds = productIdsParam.split(',');
        const productsForQuote = await Promise.all(
          productIds.map((id) => Product.get(id))
        );
        const lineItemsFromProducts = productsForQuote.
        filter((p) => p) // Filter out any null products if an ID wasn't found
        .map((p) => ({
          ...p,
          quantity: 1,
          unit_price: p.unit_price || 0
        }));
        setLineItems(lineItemsFromProducts);
      }

      await generateQuotationNumber();
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load data" });
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuotationNumber = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const existingQuotes = await Quotation.list();
      const yearQuotes = existingQuotes.filter((q) =>
      q.quotation_number && q.quotation_number.startsWith(`QUO${currentYear}`)
      );
      const sequenceNumber = yearQuotes.length + 1;
      const quotationNumber = `QUO${currentYear}/${String(sequenceNumber).padStart(4, '0')}`;

      setQuotationData((prev) => ({ ...prev, quotation_number: quotationNumber }));
    } catch (error) {
      console.error("Error generating quotation number:", error);
    }
  };

  const calculateTotals = async () => {// Made async to fetch company settings
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    let discountAmount = 0;
    if (discountType === "percentage") {
      discountAmount = subtotal * (discountValue / 100);
    } else if (discountType === "fixed") {
      discountAmount = discountValue;
    }

    const taxableTotal = subtotal - discountAmount;

    // Get VAT rate from company settings
    let vatRate = 4; // Default to 4%
    try {
      const settings = await CompanySettings.list();
      if (settings.length > 0 && settings[0].default_vat_rate !== undefined && settings[0].default_vat_rate !== null) {
        vatRate = settings[0].default_vat_rate;
      }
    } catch (error) {
      console.warn("Could not load VAT rate from settings, using default 4%:", error);
    }

    const vatAmount = taxableTotal * (vatRate / 100);
    const total = taxableTotal + vatAmount;

    return {
      subtotal,
      discountAmount,
      taxableTotal,
      vatAmount, // Changed from taxAmount
      vatRate, // Added vatRate
      total
    };
  };

  const handleSaveQuote = async (newStatus) => {
    if (!selectedCustomer) {
      setMessage({ type: "error", text: "Please select a customer before saving." });
      return;
    }

    if (lineItems.length === 0) {
      setMessage({ type: "error", text: "Please add at least one product to the quotation." });
      return;
    }

    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const totals = await calculateTotals(); // Await totals calculation

      // Get current user for history
      const user = await User.me();

      // Prepare status history entry if status is changing
      let statusHistory = originalQuoteData?.status_history ? [...originalQuoteData.status_history] : [];

      if (newStatus && newStatus !== quotationData.status) {
        statusHistory.push({
          timestamp: new Date().toISOString(),
          user: user.email, // Assuming user.email is available and suitable for history
          from_status: quotationData.status,
          to_status: newStatus
        });
      }

      const quotePayload = {
        ...quotationData,
        customer_id: selectedCustomer.id,
        customer_data: selectedCustomer,
        items: lineItems.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          product_name_snapshot: item.name, // Store snapshot for confirmed quotes
          product_code_snapshot: item.sku, // Store SKU snapshot
          description: item.description || "",
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        })),
        notes: quotationNotes, // Add notes to payload
        subtotal: totals.subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: totals.discountAmount,
        taxable_total: totals.taxableTotal,
        vat_rate: totals.vatRate, // Changed from tax_rate
        vat_amount: totals.vatAmount, // Changed from tax_amount
        total_amount: totals.total,
        status: newStatus || quotationData.status,
        status_history: statusHistory, // Added status_history
        currency: "EUR"
      };

      if (quoteId) {
        await Quotation.update(quoteId, quotePayload);
      } else {
        const newQuote = await Quotation.create(quotePayload);
        setQuoteId(newQuote.id); // Set quoteId for newly created quote
      }

      setMessage({
        type: "success",
        text: `Quote ${newStatus === 'sent' ? 'sent' : newStatus === 'confirmed' ? 'confirmed' : 'saved'} successfully!`
      });

      setTimeout(() => {
        navigate(createPageUrl("Quotes"));
      }, 2000);

    } catch (error) {
      setMessage({ type: "error", text: "Failed to save quotation. Please try again." });
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmQuote = () => {
    handleSaveQuote('confirmed'); // Changed status to 'confirmed'
  };

  const handlePrintQuote = async () => {
    if (!selectedCustomer || lineItems.length === 0) {
      setMessage({ type: "error", text: "Please complete the quote before printing." });
      return;
    }

    try {
      const settings = await CompanySettings.list();
      const companySettings = settings.length > 0 ? settings[0] : {
        company_name: "Your Company",
        address: "123 Business Street\nCity, Country",
        phone: "",
        email: "",
        vat_number: "",
        website: "",
        logo_url: ""
      };

      const totalsForPrint = await calculateTotals(); // Await calculation for print-specific totals
      const quoteDataForPrint = {
        quotation_number: quotationData.quotation_number,
        date: quotationData.date,
        valid_until: quotationData.valid_until,
        status: quotationData.status,
        terms_and_conditions: quotationData.terms_and_conditions,
        notes: quotationNotes, // Add notes to data for print
        customer: selectedCustomer,
        items: lineItems.map((item) => ({
          product_name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          description: item.description || ""
        })),
        totals: totalsForPrint, // Use the fresh totals
        discount: { type: discountType, value: discountValue },
        company_settings: companySettings,
        currency: "EUR",
        vat_rate: totalsForPrint.vatRate // Use the actual calculated VAT rate
      };

      localStorage.setItem('tempQuoteData', JSON.stringify(quoteDataForPrint));

      // Small delay to ensure localStorage is written
      setTimeout(() => {
        window.open(createPageUrl('QuotePrint'), '_blank');
      }, 100);

    } catch (error) {
      console.error("Error preparing quote for PDF:", error);
      setMessage({ type: "error", text: "Failed to prepare PDF. Please try again." });
    }
  };

  const handleSendEmail = async () => {
    // Check email configuration first
    await checkEmailConfiguration();
    
    if (!isEmailConfigured) {
      setMessage({ 
        type: "error", 
        text: "Email service not configured. Please go to Company Settings → Email Settings to configure your SMTP settings first." 
      });
      return;
    }

    // Save the quote first if it hasn't been saved or is in a different state
    if (!quoteId || quotationData.status === 'draft' || !originalQuoteData) {
      await handleSaveQuote(quotationData.status);
      if (!quoteId) {
        setMessage({ type: "error", text: "Please save the quote first before sending email." });
        return;
      }
    }

    if (!selectedCustomer) {
      setMessage({ type: "error", text: "Please select a customer before sending email." });
      return;
    }

    if (lineItems.length === 0) {
      setMessage({ type: "error", text: "Please add at least one product to the quotation before sending email." });
      return;
    }

    setIsSendingEmail(true);

    try {
      const settings = await CompanySettings.list();
      const companySettings = settings.length > 0 ? settings[0] : {
        company_name: "Your Company",
        address: "123 Business Street\nCity, Country",
        phone: "",
        email: "",
        vat_number: "",
        website: "",
        logo_url: ""
      };

      const totalsForEmail = await calculateTotals();

      // Prepare quotation data for PDF generation (matching QuotePrint structure)
      const quotationDataForPDF = {
        quotation_number: quotationData.quotation_number,
        date: quotationData.date, // Keep ISO format for backend processing
        valid_until: quotationData.valid_until, // Keep ISO format for backend processing
        company_settings: companySettings,
        customer: selectedCustomer,
        items: lineItems.map((item) => ({
          product_name: item.name,
          product_name_snapshot: item.name,
          sku: item.sku,
          product_code_snapshot: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          description: item.description || ""
        })),
        totals: totalsForEmail,
        discount: { type: discountType, value: discountValue },
        vat_rate: totalsForEmail.vatRate || 4,
        currency: "EUR",
        terms_and_conditions: quotationData.terms_and_conditions,
        notes: quotationNotes
      };

      // Prepare email data for API
      const emailData = {
        to_email: selectedCustomer.email,
        customer_name: selectedCustomer.contact_person || 'Customer',
        quotation_number: quotationData.quotation_number,
        total_amount: totalsForEmail.total,
        valid_until: format(new Date(quotationData.valid_until), 'dd/MM/yyyy'),
        notes: quotationNotes || null,
        company_name: companySettings.company_name,
        company_email: companySettings.email || "",
        quotation_data: quotationDataForPDF
      };

      // Send email via API
      const { sendQuotationEmail } = await import('@/api/integrations');
      await sendQuotationEmail(emailData);

      setMessage({
        type: "success",
        text: "Quotation email sent successfully!"
      });

    } catch (error) {
      console.error("Error sending email:", error);
      
      // Check if it's an email configuration error
      if (error.message && error.message.includes("500")) {
        setMessage({ 
          type: "error", 
          text: "Email service not configured. Please go to Company Settings > Email Settings to configure your SMTP settings first." 
        });
      } else {
        setMessage({ 
          type: "error", 
          text: error.message || "Failed to send email. Please check email configuration and try again." 
        });
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleArchiveQuote = async () => {
    if (!quoteId) return;

    setIsArchiving(true);
    try {
      const user = await User.me();
      await Quotation.update(quoteId, {
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user.email
      });

      setMessage({
        type: "success",
        text: "Quote archived successfully!"
      });

      setTimeout(() => {
        navigate(createPageUrl("Quotes"));
      }, 2000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to archive quotation. Please try again." });
      console.error("Archive error:", error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchiveQuote = async () => {
    if (!quoteId) return;

    setIsArchiving(true);
    try {
      await Quotation.update(quoteId, {
        is_archived: false,
        archived_at: null,
        archived_by: null
      });

      setMessage({
        type: "success",
        text: "Quote unarchived successfully!"
      });

      setTimeout(() => {
        navigate(createPageUrl("Quotes"));
      }, 2000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to unarchive quotation. Please try again." });
      console.error("Unarchive error:", error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRevertToDraft = async () => {
    if (!quoteId) return;

    setIsRevertingToDraft(true);
    try {
      const user = await User.me();
      
      // Add status history entry
      let statusHistory = originalQuoteData?.status_history ? [...originalQuoteData.status_history] : [];
      statusHistory.push({
        timestamp: new Date().toISOString(),
        user: user.email,
        from_status: quotationData.status,
        to_status: 'draft'
      });

      await Quotation.update(quoteId, {
        status: 'draft',
        status_history: statusHistory
      });

      // Update local state
      setQuotationData(prev => ({ ...prev, status: 'draft' }));
      setIsConfirmed(false);

      setMessage({
        type: "success",
        text: "Quote reverted to draft - you can now edit it!"
      });

      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to revert quote to draft. Please try again." });
      console.error("Revert to draft error:", error);
    } finally {
      setIsRevertingToDraft(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-700">Loading quote details...</div>;
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => navigate(createPageUrl('Dashboard'))}
            variant="ghost"
            size="icon"
            className="clay-button bg-white/70 rounded-2xl">

            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800">New Quotation</h1>
            <p className="text-slate-600">Create a professional CANNA quote for your customer</p>
          </div>
        </div>

        {/* Messages */}
        {message.text &&
        <Alert variant={message.type === "error" ? "destructive" : "default"} className="clay-shadow border-none rounded-2xl mb-6">
            {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription className="font-medium">{message.text}</AlertDescription>
          </Alert>
        }

        {/* Quotation Header */}
        <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-700" />
              </div>
              Quotation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Quote Number</Label>
              <div className="clay-inset bg-slate-100/60 p-3 rounded-2xl">
                <span className="font-bold text-purple-800">{quotationData.quotation_number}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Date</Label>
              <Input
                type="date"
                value={quotationData.date}
                onChange={(e) => setQuotationData((prev) => ({ ...prev, date: e.target.value }))}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                disabled={isConfirmed} />

            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Valid Until</Label>
              <Input
                type="date"
                value={quotationData.valid_until}
                onChange={(e) => setQuotationData((prev) => ({ ...prev, valid_until: e.target.value }))}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                disabled={isConfirmed} />

            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Status</Label>
              <div className="clay-inset bg-white/60 p-3 rounded-2xl flex items-center">
                <Badge className={`border-none rounded-full ${isConfirmed ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'}`}>
                  {quotationData.status.charAt(0).toUpperCase() + quotationData.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <CustomerSelector
              customers={customers}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              disabled={isConfirmed} />


            {/* Product Line Items */}
            <ProductLineItems
              products={products}
              lineItems={lineItems}
              setLineItems={setLineItems}
              disabled={isConfirmed} />

            {/* Quotation Notes */}
            <QuotationNotes
              notes={quotationNotes}
              setNotes={setQuotationNotes}
              disabled={isConfirmed} />

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
              <CardContent className="p-4 space-y-3">
                {!isConfirmed ?
                <>
                    <Button
                    onClick={handleConfirmQuote}
                    disabled={isSaving}
                    className="w-full clay-button bg-gradient-to-r from-green-200 to-green-300 text-green-800 border-none rounded-2xl h-12 font-semibold hover:from-green-300 hover:to-green-400">

                      <Check className="w-5 h-5 mr-2" />
                      Confirm Quote
                    </Button>
                    <Button
                    onClick={() => handleSaveQuote('draft')}
                    disabled={isSaving}
                    variant="outline"
                    className="w-full clay-button bg-white/60 text-slate-700 border-none rounded-2xl h-12 font-semibold">

                      <Save className="w-5 h-5 mr-2" />
                      Save as Draft
                    </Button>
                  </> :
                <>
                    <div className="bg-green-50/50 text-teal-700 p-4 font-semibold flex items-center justify-center clay-inset rounded-2xl mb-3">
                      <Lock className="w-5 h-5 mr-2" />
                      Quote Confirmed
                    </div>
                    <Button
                      onClick={handleRevertToDraft}
                      disabled={isRevertingToDraft}
                      variant="outline"
                      className="w-full clay-button bg-orange-50 text-orange-700 border-none rounded-2xl h-12 font-semibold hover:bg-orange-100">
                      {isRevertingToDraft ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Edit3 className="w-5 h-5 mr-2" />}
                      Revert to Draft
                    </Button>
                  </>
                }

                <Button
                  onClick={handlePrintQuote}
                  variant="outline"
                  className="w-full clay-button bg-white/60 text-slate-700 border-none rounded-2xl h-12 font-semibold">

                  <Download className="w-5 h-5 mr-2" />
                  Preview PDF
                </Button>

                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !selectedCustomer || lineItems.length === 0}
                  variant="outline"
                  className="w-full clay-button bg-blue-50 text-blue-700 border-none rounded-2xl h-12 font-semibold hover:bg-blue-100">
                  {isSendingEmail ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Mail className="w-5 h-5 mr-2" />}
                  {!isEmailConfigured ? "Configure Email First" : "Send Email"}
                </Button>
                
                {!isEmailConfigured && (
                  <Alert className="mt-3 clay-inset bg-amber-50/50 text-amber-700 border-none rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        Email service not configured. Go to <strong>Company Settings → Email Settings</strong> to set up SMTP configuration for sending quotation emails with PDF attachments.
                      </span>
                      <Button
                        onClick={checkEmailConfiguration}
                        size="sm"
                        variant="outline"
                        className="ml-2 h-8 px-3 text-xs"
                      >
                        Refresh
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Archive/Unarchive Button */}
                {quoteId &&
                <>
                    {originalQuoteData?.is_archived ?
                  <Button
                    onClick={handleUnarchiveQuote}
                    disabled={isArchiving}
                    variant="outline"
                    className="w-full clay-button bg-blue-50 text-blue-700 border-none rounded-2xl h-12 font-semibold hover:bg-blue-100">

                        {isArchiving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <RotateCcw className="w-5 h-5 mr-2" />}
                        Unarchive Quote
                      </Button> :

                  <Button
                    onClick={handleArchiveQuote}
                    disabled={isArchiving}
                    variant="outline"
                    className="w-full clay-button bg-orange-50 text-orange-700 border-none rounded-2xl h-12 font-semibold hover:bg-orange-100">

                        {isArchiving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Archive className="w-5 h-5 mr-2" />}
                        Archive Quote
                      </Button>
                  }
                  </>
                }
              </CardContent>
            </Card>

            {/* Quotation Summary */}
            <QuotationSummary
              totals={displayTotals} // Passed displayTotals state
              discountType={discountType}
              setDiscountType={setDiscountType}
              discountValue={discountValue}
              setDiscountValue={setDiscountValue}
              disabled={isConfirmed} />

          </div>
        </div>
      </div>
    </div>);

}
