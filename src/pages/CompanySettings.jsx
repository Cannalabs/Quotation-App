import React, { useState, useEffect } from "react";
import { CompanySettings } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Save, Upload, Check, AlertCircle, Eye, Users, Mail } from "lucide-react";
import { useCompanySettings } from "@/contexts/CompanySettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { CONFIG } from "@/config/constants";
import UserManagement from "@/components/UserManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CompanySettingsPage() {
  const { companySettings, updateCompanySettings, loadCompanySettings: loadContextSettings } = useCompanySettings();
  const { user } = useAuth();
  const [companyData, setCompanyData] = useState({
    company_name: CONFIG.DEFAULT_COMPANY_NAME,
    address: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postal_code: "",
    country: "",
    phone: "",
    email: "",
    vat_number: "",
    website: "",
    logo_url: "",
    bank_name_branch: "",
    bank_address_line1: "",
    bank_address_line2: "",
    account_number: "",
    iban: "",
    bic_swift: "",
    default_vat_rate: CONFIG.DEFAULT_VAT_RATE
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [emailConfig, setEmailConfig] = useState({
    mail_username: "",
    mail_password: "",
    mail_from: "",
    mail_from_name: "Grow United Italy",
    mail_port: 587,
    mail_server: "",
    mail_tls: true,
    mail_ssl: false,
    mail_use_credentials: true
  });
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  useEffect(() => {
    loadCompanySettings();
    loadEmailSettings();
  }, []);

  const loadEmailSettings = () => {
    try {
      const savedConfig = localStorage.getItem('emailConfig');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setEmailConfig(prev => ({ ...prev, ...parsedConfig }));
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  const loadCompanySettings = async () => {
    try {
      // Use the context data if available, otherwise load from API
      if (companySettings.company_name !== CONFIG.DEFAULT_COMPANY_NAME || companySettings.logo_url) {
        setCompanyData({
          company_name: companySettings.company_name || "",
          address: companySettings.address || "",
          address_line1: companySettings.address_line1 || "",
          address_line2: companySettings.address_line2 || "",
          city: companySettings.city || "",
          postal_code: companySettings.postal_code || "",
          country: companySettings.country || "",
          phone: companySettings.phone || "",
          email: companySettings.email || "",
          vat_number: companySettings.vat_number || "",
          website: companySettings.website || "",
          logo_url: companySettings.logo_url || "",
          bank_name_branch: companySettings.bank_name_branch || "",
          bank_address_line1: companySettings.bank_address_line1 || "",
          bank_address_line2: companySettings.bank_address_line2 || "",
          account_number: companySettings.account_number || "",
          iban: companySettings.iban || "",
          bic_swift: companySettings.bic_swift || "",
          default_vat_rate: companySettings.default_vat_rate || CONFIG.DEFAULT_VAT_RATE
        });
      } else {
        const settings = await CompanySettings.list();
        if (settings.length > 0) {
          // If settings exist, use them. Convert null values to empty strings for controlled inputs
          const setting = settings[0];
          setCompanyData({
              company_name: setting.company_name || "",
              address: setting.address || "",
              address_line1: setting.address_line1 || "",
              address_line2: setting.address_line2 || "",
              city: setting.city || "",
              postal_code: setting.postal_code || "",
              country: setting.country || "",
              phone: setting.phone || "",
              email: setting.email || "",
              vat_number: setting.vat_number || "",
              website: setting.website || "",
              logo_url: setting.logo_url || "",
              bank_name_branch: setting.bank_name_branch || "",
              bank_address_line1: setting.bank_address_line1 || "",
              bank_address_line2: setting.bank_address_line2 || "",
              account_number: setting.account_number || "",
              iban: setting.iban || "",
              bic_swift: setting.bic_swift || "",
                  default_vat_rate: setting.default_vat_rate !== undefined ? setting.default_vat_rate : CONFIG.DEFAULT_VAT_RATE
          });
        }
      }
    } catch (error) {
      console.error("Error loading company settings:", error);
      setMessage({ type: "error", text: "Failed to load company settings." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const existingSettings = await CompanySettings.list();
      
      // Clean the data to ensure proper validation
      const cleanData = {
        company_name: companyData.company_name || "",
        address: companyData.address || null,
        address_line1: companyData.address_line1 || null,
        address_line2: companyData.address_line2 || null,
        city: companyData.city || null,
        postal_code: companyData.postal_code || null,
        country: companyData.country || null,
        phone: companyData.phone || null,
        email: companyData.email || null,
        vat_number: companyData.vat_number || null,
        website: companyData.website || null,
        logo_url: companyData.logo_url || null,
        bank_name_branch: companyData.bank_name_branch || null,
        bank_address_line1: companyData.bank_address_line1 || null,
        bank_address_line2: companyData.bank_address_line2 || null,
        account_number: companyData.account_number || null,
        iban: companyData.iban || null,
        bic_swift: companyData.bic_swift || null,
        default_vat_rate: companyData.default_vat_rate || CONFIG.DEFAULT_VAT_RATE
      };
      
      if (existingSettings.length > 0) {
        await CompanySettings.update(cleanData);
        setMessage({ type: "success", text: "Company settings updated successfully!" });
      } else {
        await CompanySettings.create(cleanData);
        setMessage({ type: "success", text: "Company settings created successfully!" });
      }

      // Update the context with the new settings
      updateCompanySettings(cleanData);
      
      // Reload company settings in context
      await loadContextSettings();

      setTimeout(() => setMessage({ type: "", text: "" }), CONFIG.TIMEOUTS.DEFAULT);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save company settings" });
      console.error("Save company settings error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type - accept PNG, JPG, JPEG, SVG
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Please select a valid image file (PNG, JPG, JPEG, SVG)." });
      return;
    }

    // Validate file size (5MB max for company logos)
    if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) {
      setMessage({ type: "error", text: "File size must be less than 5MB." });
      return;
    }

    setIsUploading(true);
    setMessage({ type: "", text: "" }); // Clear previous messages

    try {
      // Upload file using the Core integration
      const result = await UploadFile({ file });
      
      if (result && result.file_url) {
        // Update company data with new logo URL
        setCompanyData(prev => ({ 
          ...prev, 
          logo_url: result.file_url 
        }));

        // Update context immediately for preview
        updateCompanySettings({ logo_url: result.file_url });

        setMessage({ type: "success", text: "Company logo uploaded successfully! Don't forget to save your changes." });
        setTimeout(() => setMessage({ type: "", text: "" }), CONFIG.TIMEOUTS.UPLOAD);
      } else {
        throw new Error("Upload failed - no file URL returned.");
      }
    } catch (error) {
      console.error("Logo upload error:", error);
      setMessage({ type: "error", text: "Failed to upload company logo. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEmailConfigChange = (field, value) => {
    setEmailConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      setMessage({ type: "error", text: "Please enter an email address to test." });
      return;
    }

    setIsTestingEmail(true);
    try {
      const { sendTestEmail } = await import('@/api/integrations');
      await sendTestEmail(testEmailAddress);
      setMessage({ type: "success", text: "Test email sent successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to send test email." });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    setIsSaving(true);
    try {
      const { saveEmailConfig } = await import('@/api/integrations');
      await saveEmailConfig(emailConfig);
      
      setMessage({ 
        type: "success", 
        text: "Email settings saved successfully! You can now test the email functionality." 
      });
      
      // Store in localStorage for persistence during session
      localStorage.setItem('emailConfig', JSON.stringify(emailConfig));
      
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error.message || "Failed to save email settings. Please try again." 
      });
      console.error("Save email settings error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setCompanyData(prev => ({ ...prev, logo_url: "" }));
    setMessage({ type: "success", text: "Logo removed. Don't forget to save your changes." });
    setTimeout(() => setMessage({ type: "", text: "" }), CONFIG.TIMEOUTS.DEFAULT);
  };

  const handlePreview = () => {
    // Create sample quote data for preview
    const sampleQuoteData = {
      quotation_number: "PREVIEW-001",
      date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + CONFIG.DEFAULT_QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customer: {
        company_name: "Sample Customer Ltd",
        contact_person: "John Doe",
        email: "john@sample.com",
        address: "123 Sample Street, Sample City",
        vat_number: "VAT123456789"
      },
      items: [
        {
          product_name: "Sample Product",
          sku: "SAMPLE-001",
          quantity: 2,
          unit_price: 50.00,
          description: "This is a sample product for preview"
        }
      ],
      totals: {
        subtotal: 100.00,
        discountAmount: 0,
        taxAmount: 22.00,
        total: 122.00
      },
      discount: { type: 'none', value: 0 },
      terms_and_conditions: "Sample terms and conditions",
      company_settings: companyData // Pass current companyData for preview
    };

    localStorage.setItem('tempQuoteData', JSON.stringify(sampleQuoteData));
    window.open(createPageUrl('QuotePrint'), '_blank');
  };

  const handleChange = (field, value) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded-2xl w-64"></div>
            <div className="h-96 bg-slate-200 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
      <style>
        {`
          .clay-shadow {
            box-shadow: 
              8px 8px 16px rgba(163, 177, 198, 0.15),
              -8px -8px 16px rgba(255, 255, 255, 0.7),
              inset 2px 2px 4px rgba(255, 255, 255, 0.2),
              inset -2px -2px 4px rgba(163, 177, 198, 0.1);
          }
          
          .clay-inset {
            box-shadow: 
              inset 6px 6px 12px rgba(163, 177, 198, 0.2),
              inset -6px -6px 12px rgba(255, 255, 255, 0.8);
          }
          
          .clay-button {
            box-shadow: 
              4px 4px 8px rgba(163, 177, 198, 0.2),
              -4px -4px 8px rgba(255, 255, 255, 0.8);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .clay-button:hover {
            box-shadow: 
              2px 2px 4px rgba(163, 177, 198, 0.25),
              -2px -2px 4px rgba(255, 255, 255, 0.9);
            transform: translate(1px, 1px);
          }
          
          .clay-button:active {
            box-shadow: 
              inset 2px 2px 4px rgba(163, 177, 198, 0.3),
              inset -2px -2px 4px rgba(255, 255, 255, 0.7);
            transform: translate(2px, 2px);
          }
        `}
      </style>
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Company Settings</h1>
            <p className="text-slate-600 text-lg">Manage your company profile and branding</p>
          </div>
          
          <Button
            onClick={handlePreview}
            variant="outline"
            className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl"
          >
            <Eye className="w-5 h-5 mr-2" />
            Preview PDF
          </Button>
        </div>

        {/* Messages */}
        {message.text && (
          <Alert variant={message.type === "error" ? "destructive" : "default"} className="clay-shadow border-none rounded-2xl">
            {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription className="font-medium">{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="company" className="space-y-6">
          <div className="clay-shadow bg-gradient-to-r from-white/80 to-slate-50/80 backdrop-blur-sm rounded-3xl p-2 transition-all duration-300 w-fit mx-auto">
            <TabsList className="flex bg-transparent h-auto p-0 gap-2 flex-wrap justify-center">
              <TabsTrigger 
                value="company" 
                className="flex items-center gap-2 clay-button bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-none rounded-2xl px-5 py-3 font-semibold hover:from-blue-200 hover:to-blue-300 data-[state=active]:from-blue-200 data-[state=active]:to-blue-300 data-[state=active]:clay-shadow data-[state=active]:scale-105 data-[state=active]:shadow-lg transition-all duration-300 whitespace-nowrap"
              >
                <Building2 className="w-4 h-4" />
                Company Info
              </TabsTrigger>
              <TabsTrigger 
                value="email" 
                className="flex items-center gap-2 clay-button bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-none rounded-2xl px-5 py-3 font-semibold hover:from-green-200 hover:to-green-300 data-[state=active]:from-green-200 data-[state=active]:to-green-300 data-[state=active]:clay-shadow data-[state=active]:scale-105 data-[state=active]:shadow-lg transition-all duration-300 whitespace-nowrap"
              >
                <Mail className="w-4 h-4" />
                Email Settings
              </TabsTrigger>
              {user?.role === 'admin' && (
                <TabsTrigger 
                  value="users" 
                  className="flex items-center gap-2 clay-button bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-none rounded-2xl px-5 py-3 font-semibold hover:from-purple-200 hover:to-purple-300 data-[state=active]:from-purple-200 data-[state=active]:to-purple-300 data-[state=active]:clay-shadow data-[state=active]:scale-105 data-[state=active]:shadow-lg transition-all duration-300 whitespace-nowrap"
                >
                  <Users className="w-4 h-4" />
                  User Management
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="company">
            {/* Company Info Form */}
            <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-700" />
                  </div>
                  Company Information
                </CardTitle>
              </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium">Company Logo</Label>
              <div className="flex items-center gap-4">
                {companyData.logo_url && (
                  <div className="w-20 h-20 clay-shadow rounded-2xl overflow-hidden bg-white p-2 flex items-center justify-center">
                    <img 
                      src={companyData.logo_url} 
                      alt="Company Logo" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        console.error("Logo image failed to load:", companyData.logo_url);
                        e.target.style.display = 'none'; 
                      }}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload">
                      <Button
                        type="button"
                        asChild
                        variant="outline"
                        className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl cursor-pointer"
                        disabled={isUploading}
                      >
                         <span>
                            <Upload className="w-4 h-4 mr-2" />
                            {isUploading ? "Uploading..." : "Upload Logo"}
                         </span>
                      </Button>
                    </label>
                    {companyData.logo_url && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveLogo}
                        className="clay-button bg-red-50 text-red-700 border-none rounded-2xl hover:bg-red-100"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">PNG, JPG, SVG up to 5MB</p>
                  {isUploading && (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-slate-600">Uploading...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Company Name</Label>
                <Input
                  value={companyData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="Your Company Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Email</Label>
                <Input
                  type="email"
                  value={companyData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="info@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Phone</Label>
                <Input
                  value={companyData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">VAT/Tax ID</Label>
                <Input
                  value={companyData.vat_number}
                  onChange={(e) => handleChange("vat_number", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="VAT123456789"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Website</Label>
                <Input
                  value={companyData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="https://www.company.com"
                />
              </div>

              {/* New Default VAT Rate Field */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Default VAT Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={companyData.default_vat_rate}
                  onChange={(e) => handleChange("default_vat_rate", parseFloat(e.target.value) || 0)} // Parse to float, default to 0 if invalid
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="4.0"
                />
              </div>
            </div>

            {/* Structured Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Address Line 1</Label>
                <Input
                  value={companyData.address_line1}
                  onChange={(e) => handleChange("address_line1", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="Street, number"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Address Line 2</Label>
                <Input
                  value={companyData.address_line2}
                  onChange={(e) => handleChange("address_line2", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="Suite, floor, building (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">City</Label>
                <Input
                  value={companyData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="Milano"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Postal Code</Label>
                <Input
                  value={companyData.postal_code}
                  onChange={(e) => handleChange("postal_code", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="20121"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Country</Label>
                <Input
                  value={companyData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                  placeholder="Italy"
                />
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
              <Label className="text-slate-700 font-semibold">Bank Details</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Bank Name / Branch</Label>
                  <Input
                    value={companyData.bank_name_branch}
                    onChange={(e) => handleChange("bank_name_branch", e.target.value)}
                    className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                    placeholder="Bank & branch"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Bank Address Line 1</Label>
                  <Input
                    value={companyData.bank_address_line1}
                    onChange={(e) => handleChange("bank_address_line1", e.target.value)}
                    className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                    placeholder="Bank street and number"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Bank Address Line 2</Label>
                  <Input
                    value={companyData.bank_address_line2}
                    onChange={(e) => handleChange("bank_address_line2", e.target.value)}
                    className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                    placeholder="Additional address info (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Account Number</Label>
                  <Input
                    value={companyData.account_number}
                    onChange={(e) => handleChange("account_number", e.target.value)}
                    className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                    placeholder="1118520"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">IBAN</Label>
                  <Input
                    value={companyData.iban}
                    onChange={(e) => handleChange("iban", e.target.value)}
                    className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                    placeholder="IT87I0333201600000001118520"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">BIC/Swift</Label>
                  <Input
                    value={companyData.bic_swift}
                    onChange={(e) => handleChange("bic_swift", e.target.value)}
                    className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                    placeholder="PASBITGG"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="clay-button bg-gradient-to-r from-blue-200 to-blue-300 text-blue-800 border-none rounded-2xl px-8 py-3 font-semibold hover:from-blue-300 hover:to-blue-400"
              >
                <Save className="w-5 h-5 mr-2" />
                {isSaving ? "Saving..." : "Save Company Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="email">
            {/* Email Configuration Form */}
            <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-700" />
                  </div>
                  Email Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="clay-inset bg-blue-50/50 text-blue-700 border-none rounded-2xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configure your SMTP settings to enable direct email sending. For Gmail, use an App Password instead of your regular password.
                    <br /><br />
                    <strong>Gmail Settings:</strong><br />
                    • SMTP Server: smtp.gmail.com<br />
                    • Port: 587<br />
                    • Use TLS: Yes<br />
                    • Password: Use App Password (not your regular Gmail password)
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">SMTP Server</Label>
                    <Input
                      type="text"
                      value={emailConfig.mail_server}
                      onChange={(e) => handleEmailConfigChange("mail_server", e.target.value)}
                      className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Port</Label>
                    <Input
                      type="number"
                      value={emailConfig.mail_port}
                      onChange={(e) => handleEmailConfigChange("mail_port", parseInt(e.target.value) || 587)}
                      className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                      placeholder="587"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Username/Email</Label>
                    <Input
                      type="email"
                      value={emailConfig.mail_username}
                      onChange={(e) => handleEmailConfigChange("mail_username", e.target.value)}
                      className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                      placeholder="your_email@gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Password/App Password</Label>
                    <Input
                      type="password"
                      value={emailConfig.mail_password}
                      onChange={(e) => handleEmailConfigChange("mail_password", e.target.value)}
                      className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                      placeholder="Your app password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">From Email</Label>
                    <Input
                      type="email"
                      value={emailConfig.mail_from}
                      onChange={(e) => handleEmailConfigChange("mail_from", e.target.value)}
                      className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                      placeholder="your_email@gmail.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">From Name</Label>
                    <Input
                      type="text"
                      value={emailConfig.mail_from_name}
                      onChange={(e) => handleEmailConfigChange("mail_from_name", e.target.value)}
                      className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                      placeholder="Grow United Italy"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="mail_tls"
                      checked={emailConfig.mail_tls}
                      onChange={(e) => handleEmailConfigChange("mail_tls", e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="mail_tls" className="text-slate-700 font-medium">Use TLS</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="mail_ssl"
                      checked={emailConfig.mail_ssl}
                      onChange={(e) => handleEmailConfigChange("mail_ssl", e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="mail_ssl" className="text-slate-700 font-medium">Use SSL</Label>
                  </div>
                </div>

                {/* Test Email Section */}
                <div className="space-y-4 p-4 clay-inset bg-slate-50/50 rounded-2xl">
                  <h3 className="text-lg font-semibold text-slate-700">Test Email Configuration</h3>
                  <div className="flex gap-3">
                    <Input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className="clay-inset bg-white/60 border-none rounded-2xl h-12 flex-1"
                      placeholder="Enter email address to test"
                    />
                    <Button
                      onClick={handleTestEmail}
                      disabled={isTestingEmail || !testEmailAddress}
                      className="clay-button bg-green-50 text-green-700 border-none rounded-2xl h-12 px-6 font-semibold hover:bg-green-100"
                    >
                      {isTestingEmail ? <Check className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      {isTestingEmail ? "Sending..." : "Send Test"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveEmailSettings}
                    disabled={isSaving}
                    className="clay-button bg-gradient-to-r from-green-200 to-green-300 text-green-800 border-none rounded-2xl h-12 px-8 font-semibold hover:from-green-300 hover:to-green-400"
                  >
                    {isSaving ? <Check className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {isSaving ? "Saving..." : "Save Email Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role === 'admin' && (
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
