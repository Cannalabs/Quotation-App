import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Save, X, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Country } from "@/api/entities";

export default function CustomerForm({ customer, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    company_name: customer?.company_name || "",
    contact_person: customer?.contact_person || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    vat_number: customer?.vat_number || "",
    country: customer?.country || "Italy",
    address: customer?.address || "",
    notes: customer?.notes || "",
    source: customer?.source || "",
    opportunity: customer?.opportunity || ""
  });

  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [newSource, setNewSource] = useState("");
  const [sources] = useState([
    "Website",
    "Social Media",
    "Referral",
    "Trade Show",
    "Cold Call",
    "Email Campaign",
    "Partner",
    "Direct Visit"
  ]);

  const [countries, setCountries] = useState([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);

  // Load countries from API
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await Country.list();
        setCountries(countriesData);
      } catch (error) {
        console.error("Failed to load countries:", error);
        // Fallback to basic list if API fails
        setCountries([
          { code: "IT", name: "Italy" },
          { code: "DE", name: "Germany" },
          { code: "FR", name: "France" },
          { code: "ES", name: "Spain" },
          { code: "US", name: "United States" },
          { code: "GB", name: "United Kingdom" },
          { code: "OTHER", name: "Other" }
        ]);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSource = () => {
    if (newSource.trim()) {
      // In a real app, you'd save this to a sources database
      handleChange('source', newSource.trim());
      setNewSource("");
      setShowSourceDialog(false);
    }
  };

  const getOpportunityColor = (level) => {
    const colors = {
      high: "bg-green-500",
      medium: "bg-yellow-500", 
      low: "bg-red-500"
    };
    return colors[level] || "bg-gray-300";
  };

  const getOpportunityLabel = (level) => {
    const labels = {
      high: "High Opportunity",
      medium: "Medium Opportunity",
      low: "Low Opportunity"
    };
    return labels[level] || "Select Opportunity";
  };

  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-700" />
          </div>
          {customer ? "Edit Customer" : "Add New Customer"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name - Required */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Company Name *</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                placeholder="Enter company name"
                required
              />
            </div>

            {/* Contact Person - Required */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Contact Person *</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => handleChange('contact_person', e.target.value)}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                placeholder="Enter contact person name"
                required
              />
            </div>

            {/* Email - Required */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Email *</Label>
              <Input
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                placeholder="Enter email address"
                type="email"
                required
              />
            </div>

            {/* Country - Required with dropdown */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Country *</Label>
              <Select 
                value={formData.country} 
                onValueChange={(value) => handleChange('country', value)}
                disabled={isLoadingCountries}
              >
                <SelectTrigger className="clay-inset bg-white/60 border-none rounded-2xl h-12">
                  <SelectValue placeholder={isLoadingCountries ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone - Optional */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                placeholder="Enter phone number"
                type="tel"
              />
            </div>

            {/* VAT Number - Optional */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">VAT Number</Label>
              <Input
                value={formData.vat_number}
                onChange={(e) => handleChange('vat_number', e.target.value)}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                placeholder="Enter VAT number"
              />
            </div>

            {/* Source Field */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Source</Label>
              <div className="flex gap-2">
                <Select value={formData.source} onValueChange={(value) => handleChange('source', value)}>
                  <SelectTrigger className="clay-inset bg-white/60 border-none rounded-2xl h-12 flex-1">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button"
                      variant="outline"
                      size="icon"
                      className="clay-button bg-white/60 border-none rounded-2xl h-12"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="clay-shadow border-none rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Source</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        value={newSource}
                        onChange={(e) => setNewSource(e.target.value)}
                        placeholder="Enter new source name"
                        className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowSourceDialog(false)}
                          className="clay-button bg-white/60 border-none rounded-2xl"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleAddSource}
                          className="clay-button bg-gradient-to-r from-green-200 to-green-300 text-green-800 border-none rounded-2xl"
                        >
                          Add Source
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Opportunity Field */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Opportunity</Label>
              <Select value={formData.opportunity} onValueChange={(value) => handleChange('opportunity', value)}>
                <SelectTrigger className="clay-inset bg-white/60 border-none rounded-2xl h-12">
                  <div className="flex items-center gap-2">
                    {formData.opportunity && (
                      <div className={`w-3 h-3 rounded-full ${getOpportunityColor(formData.opportunity)}`}></div>
                    )}
                    <SelectValue placeholder="Select opportunity level" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      High Opportunity
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      Medium Opportunity
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      Low Opportunity
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="clay-inset bg-white/60 border-none rounded-2xl h-12"
              placeholder="Full address"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" onClick={onCancel} variant="outline" className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl px-6">
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button type="submit" className="clay-button bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 border-none rounded-2xl px-6 hover:from-purple-300 hover:to-purple-400">
              <Save className="w-4 h-4 mr-2" /> {customer ? "Update" : "Save"} Customer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}