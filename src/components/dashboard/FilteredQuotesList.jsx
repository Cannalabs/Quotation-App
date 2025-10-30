import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, FileText, Download, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function FilteredQuotesList({ quotes, title, subtitle, onClose }) {
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

  const formatDate = (dateString) => {
    try {
      const date = parseISO(dateString) || new Date(dateString);
      return format(date, "MMM dd, yyyy");
    } catch {
      return 'N/A';
    }
  };

  const exportToCSV = () => {
    const headers = ['Quote Number', 'Customer', 'Status', 'Date', 'Total Value'];
    const csvContent = [
      headers.join(','),
      ...quotes.map(quote => [
        quote.quotation_number || '',
        `"${quote.customer_name || quote.customer_data?.company_name || ''}"`,
        quote.status || '',
        formatDate(quote.created_date),
        (quote.total || quote.total_amount || 0).toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `quotes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const totalValue = quotes.reduce((sum, quote) => sum + (quote.total || quote.total_amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="clay-shadow bg-white border-none rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-700" />
              </div>
              {title}
            </CardTitle>
            <p className="text-slate-600 mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="clay-button bg-white/60 border-none rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="clay-button rounded-xl">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="clay-inset bg-gradient-to-r from-purple-50 to-purple-100 border-none rounded-2xl">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Quotes</p>
                  <p className="text-2xl font-bold text-purple-800">{quotes.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="clay-inset bg-gradient-to-r from-green-50 to-green-100 border-none rounded-2xl">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Value</p>
                  <p className="text-2xl font-bold text-green-800">€{totalValue.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quotes Table */}
          {quotes.length === 0 ? (
            <div className="text-center py-12 clay-inset bg-slate-50/60 rounded-2xl">
              <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Quotes Found</h3>
              <p className="text-slate-500">No quotes match the current criteria</p>
            </div>
          ) : (
            <Card className="clay-inset bg-white/40 border-none rounded-2xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map(quote => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quotation_number}</TableCell>
                      <TableCell>{quote.customer_name || quote.customer_data?.company_name}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(quote.status)} border-none rounded-full px-3 py-1 text-xs font-semibold`}>
                          {quote.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(quote.created_date)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        €{quote.total?.toFixed(2) || quote.total_amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Link to={createPageUrl(`QuoteBuilder?id=${quote.id}`)}>
                          <Button size="sm" variant="outline" className="clay-button bg-white/60 text-slate-700 border-none rounded-xl h-9">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}