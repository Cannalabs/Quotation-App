import React, { useState, useEffect } from "react";
import { CheckCircle, Search, LayoutGrid, List, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QuotesList from "../components/quotes/QuotesList";
import { format } from "date-fns";
import { Quotation } from "@/api/entities";

export default function ConfirmedSalesOrders() {
  const [confirmedQuotes, setConfirmedQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    averageValue: 0
  });

  useEffect(() => {
    loadConfirmedOrders();
  }, []);

  useEffect(() => {
    const filtered = confirmedQuotes.filter(q =>
      (q.quotation_number && q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.customer_name && q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredQuotes(filtered);
  }, [confirmedQuotes, searchTerm]);

  const loadConfirmedOrders = async () => {
    setIsLoading(true);
    try {
      const data = await Quotation.list("-created_date");
      // Filter only confirmed quotes that are not deleted or archived
      const confirmed = data.filter(q => 
        q.status === 'confirmed' && 
        !q.is_deleted && 
        !q.is_archived
      );
      
      setConfirmedQuotes(confirmed);
      
      // Calculate stats
      const totalValue = confirmed.reduce((sum, q) => sum + (q.total || 0), 0);
      setStats({
        totalOrders: confirmed.length,
        totalValue: totalValue,
        averageValue: confirmed.length > 0 ? totalValue / confirmed.length : 0
      });
    } catch (error) {
      console.error("Failed to load confirmed orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Quote Number', 'Customer', 'Date', 'Valid Until', 'Total Value'];
    const csvContent = [
      headers.join(','),
      ...filteredQuotes.map(quote => [
        quote.quotation_number || '',
        `"${quote.customer_name || ''}"`,
        format(new Date(quote.created_date), 'yyyy-MM-dd'),
        format(new Date(quote.valid_until), 'yyyy-MM-dd'),
        (quote.total || 0).toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `confirmed_sales_orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-700" />
              </div>
              Confirmed Sales Orders
            </h1>
            <p className="text-slate-600 text-lg">View all confirmed quotations</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                Total Confirmed Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-800">{stats.totalOrders}</p>
            </CardContent>
          </Card>

          <Card className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">€{stats.totalValue.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                Average Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">€{stats.averageValue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and View Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by quote number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 clay-inset bg-white/60 border-none rounded-2xl h-12 text-slate-700 placeholder-slate-400"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            
            <div className="flex items-center gap-2 p-1 bg-slate-200/50 rounded-2xl clay-inset">
              <Button 
                size="icon" 
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className={`clay-button rounded-xl ${viewMode === 'grid' ? 'bg-white/80' : ''}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
              <Button 
                size="icon" 
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className={`clay-button rounded-xl ${viewMode === 'list' ? 'bg-white/80' : ''}`}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredQuotes.length === 0 && !isLoading ? (
          <Card className="clay-shadow bg-white/60 border-none rounded-3xl text-center p-12">
            <CheckCircle className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Confirmed Orders</h3>
            <p className="text-slate-500">Confirmed sales orders will appear here</p>
          </Card>
        ) : (
          <QuotesList 
            quotes={filteredQuotes} 
            isLoading={isLoading} 
            viewMode={viewMode}
            showTrash={false}
          />
        )}
      </div>
    </div>
  );
}