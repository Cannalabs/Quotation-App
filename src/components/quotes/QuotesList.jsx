
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isValid, parseISO } from "date-fns";
import { FileText, Eye, Mail, Download, Edit, Trash2, RotateCcw, Archive } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { canDelete, canArchive, canRestore } from "@/utils/permissions";

export default function QuotesList({ 
  quotes, 
  isLoading, 
  viewMode, 
  showTrash = false, 
  showArchived = false,
  selectedQuotes = [], 
  onSelectQuote, 
  onDelete,
  onRestore,
  onPermanentDelete,
  onArchive,
  onUnarchive,
  user // Added user prop for permission checking
}) {
  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700",
      sent: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700",
      confirmed: "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700",
      accepted: "bg-gradient-to-r from-green-100 to-green-200 text-green-700",
      rejected: "bg-gradient-to-r from-red-100 to-red-200 text-red-700",
      expired: "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700",
    };
    return colors[status] || colors.draft;
  };

  // Helper function to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    let date;
    if (typeof dateString === 'string') {
      // Try parsing ISO string first
      date = parseISO(dateString);
      // If that fails, try creating new Date
      if (!isValid(date)) {
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (!isValid(date)) {
      console.warn('Invalid date:', dateString);
      return 'Invalid Date';
    }
    
    return format(date, "MMM dd, yyyy");
  };

  const handlePrintQuote = async (quote) => {
    try {
      // We need company settings for the PDF header
      const { CompanySettings } = await import('@/api/entities');
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

      // Ensure items have proper product names for PDF
      const enhancedItems = (quote.items || []).map(item => ({
        ...item,
        product_name: item.product_name_snapshot || item.product_name || item.name,
        sku: item.product_code_snapshot || item.sku
      }));

      const quoteData = {
        ...quote,
        customer: quote.customer_data,
        items: enhancedItems,
        totals: {
          subtotal: quote.subtotal || 0,
          discountAmount: quote.discount_amount || 0,
          vatAmount: quote.vat_amount || quote.tax_amount || 0,
          total: quote.total || quote.total_amount || 0
        },
        discount: { 
          type: quote.discount_type || 'none', 
          value: quote.discount_value || 0 
        },
        company_settings: companySettings,
        currency: quote.currency || 'EUR',
        vat_rate: quote.vat_rate || quote.tax_rate || 4
      };

      // Store data and open print window
      localStorage.setItem('tempQuoteData', JSON.stringify(quoteData));
      
      // Small delay to ensure localStorage is written
      setTimeout(() => {
        window.open(createPageUrl('QuotePrint'), '_blank');
      }, 100);
      
    } catch (error) {
      console.error("Error preparing quote for PDF:", error);
      alert("Failed to prepare PDF. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-3xl" />
        ))}
      </div>
    );
  }
  
  if (quotes.length === 0) {
    return (
      <Card className="clay-shadow bg-white/60 border-none rounded-3xl text-center p-12">
        <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">
          {showTrash ? "No Deleted Quotes" : showArchived ? "No Archived Quotes" : "No Quotes Found"}
        </h3>
        <p className="text-slate-500">
          {showTrash ? "Deleted quotes will appear here" : showArchived ? "Archived quotes will appear here" : "Your created quotes will appear here."}
        </p>
      </Card>
    );
  }

  if (viewMode === 'list') {
    return (
      <Card className="clay-shadow bg-white/80 border-none rounded-3xl backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {(!showTrash && onSelectQuote) && (
                <TableHead className="w-12">
                  <span className="sr-only">Select</span>
                </TableHead>
              )}
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map(quote => (
              <TableRow key={quote.id}>
                {(!showTrash && onSelectQuote) && (
                  <TableCell>
                    <Checkbox 
                      checked={selectedQuotes.includes(quote.id)}
                      onCheckedChange={(checked) => onSelectQuote(quote.id, checked)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{quote.quotation_number}</TableCell>
                <TableCell>{quote.customer_name || quote.customer_data?.company_name}</TableCell>
                <TableCell>{formatDate(quote.created_date)}</TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(quote.status)} border-none rounded-full px-3 py-1 text-xs font-semibold`}>
                    {quote.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">€{quote.total?.toFixed(2) || quote.total_amount?.toFixed(2)}</TableCell>
                <TableCell className="flex gap-2">
                  {showTrash ? (
                    <>
                      {canRestore(user) && (
                        <Button size="sm" variant="outline" onClick={() => onRestore(quote)} className="clay-button bg-green-50 text-green-700 border-none rounded-xl h-9">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete(user) && (
                        <Button size="sm" variant="outline" onClick={() => onPermanentDelete(quote)} className="clay-button bg-red-50 text-red-700 border-none rounded-xl h-9">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  ) : showArchived ? (
                    <>
                      <Link to={createPageUrl(`QuoteBuilder?id=${quote.id}`)}>
                        <Button size="sm" variant="outline" className="clay-button bg-white/60 text-slate-700 border-none rounded-xl h-9">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => handlePrintQuote(quote)} className="clay-button bg-white/60 text-slate-700 border-none rounded-xl h-9">
                        <Download className="w-4 h-4" />
                      </Button>
                      {canRestore(user) && (
                        <Button size="sm" variant="outline" onClick={() => onUnarchive(quote)} className="clay-button bg-blue-50 text-blue-700 border-none rounded-xl h-9">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Link to={createPageUrl(`QuoteBuilder?id=${quote.id}`)}>
                        <Button size="sm" variant="outline" className="clay-button bg-white/60 text-slate-700 border-none rounded-xl h-9">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => handlePrintQuote(quote)} className="clay-button bg-white/60 text-slate-700 border-none rounded-xl h-9">
                        <Download className="w-4 h-4" />
                      </Button>
                      {quote.status === 'draft' && onDelete && canDelete(user) && (
                        <Button size="sm" variant="outline" onClick={() => onDelete(quote)} className="clay-button bg-red-50 text-red-700 border-none rounded-xl h-9">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {onArchive && canArchive(user) && (
                        <Button size="sm" variant="outline" onClick={() => onArchive(quote)} className="clay-button bg-orange-50 text-orange-700 border-none rounded-xl h-9">
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {quotes.map(quote => (
        <Card key={quote.id} className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl backdrop-blur-sm hover:scale-102 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                {(!showTrash && onSelectQuote) && (
                  <Checkbox 
                    checked={selectedQuotes.includes(quote.id)}
                    onCheckedChange={(checked) => onSelectQuote(quote.id, checked)}
                  />
                )}
                <div>
                  <p className="font-bold text-lg text-slate-800">{quote.quotation_number}</p>
                  <p className="text-sm text-slate-600">{formatDate(quote.created_date)}</p>
                </div>
              </div>
              <Badge className={`${getStatusColor(quote.status)} border-none rounded-full px-3 py-1 text-xs font-semibold`}>
                {quote.status.toUpperCase()}
              </Badge>
            </div>
            
            <div className="mb-4">
              <p className="font-semibold text-slate-700">{quote.customer_name || quote.customer_data?.company_name}</p>
              <p className="text-sm text-slate-500">{quote.customer_contact_person || quote.customer_data?.contact_person}</p>
              <p className="text-xs text-slate-400">{quote.customer_email || quote.customer_data?.email}</p>
              {quote.customer_phone && (
                <p className="text-xs text-slate-400">{quote.customer_phone}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-500">Valid until:</span>
              <span className="text-sm font-medium text-slate-700">
                {formatDate(quote.valid_until)}
              </span>
            </div>
            
            <div className="text-right pt-4 border-t border-slate-200/50 mb-4">
              <p className="text-sm text-slate-500">Total Amount</p>
              <p className="font-bold text-2xl text-slate-800">€{quote.total?.toFixed(2) || quote.total_amount?.toFixed(2)}</p>
            </div>

            <div className="flex gap-2">
              {showTrash ? (
                <>
                  {canRestore(user) && (
                    <Button onClick={() => onRestore(quote)} size="sm" className="flex-1 clay-button bg-green-50 text-green-700 border-none rounded-2xl h-9 text-xs">
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restore
                    </Button>
                  )}
                  {canDelete(user) && (
                    <Button onClick={() => onPermanentDelete(quote)} size="sm" className="flex-1 clay-button bg-red-50 text-red-700 border-none rounded-2xl h-9 text-xs">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete Forever
                    </Button>
                  )}
                </>
              ) : showArchived ? (
                <>
                  <Link to={createPageUrl(`QuoteBuilder?id=${quote.id}`)} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full clay-button bg-white/60 text-slate-700 border-none rounded-2xl h-9 text-xs">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => handlePrintQuote(quote)} className="flex-1 clay-button bg-white/60 text-slate-700 border-none rounded-2xl h-9 text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                  {canRestore(user) && (
                    <Button size="sm" onClick={() => onUnarchive(quote)} className="clay-button bg-blue-50 text-blue-700 border-none rounded-2xl h-9 px-2">
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Link to={createPageUrl(`QuoteBuilder?id=${quote.id}`)} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full clay-button bg-white/60 text-slate-700 border-none rounded-2xl h-9 text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      View/Edit
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => handlePrintQuote(quote)} className="flex-1 clay-button bg-white/60 text-slate-700 border-none rounded-2xl h-9 text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                  {quote.status === 'draft' && onDelete && canDelete(user) && (
                    <Button size="sm" onClick={() => onDelete(quote)} className="clay-button bg-red-50 text-red-700 border-none rounded-2xl h-9 px-2">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                  {onArchive && canArchive(user) && (
                    <Button size="sm" onClick={() => onArchive(quote)} className="clay-button bg-orange-50 text-orange-700 border-none rounded-2xl h-9 px-2">
                      <Archive className="w-3 h-3" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
