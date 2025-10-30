import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Quotation } from "@/api/entities";
import { Package, TrendingUp, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function TopProducts({ isLoading }) {
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productQuotes, setProductQuotes] = useState([]);
  const [showQuotesDialog, setShowQuotesDialog] = useState(false);

  useEffect(() => {
    loadTopProducts();
  }, []);

  const loadTopProducts = async () => {
    try {
      const quotes = await Quotation.list();
      
      const productStats = {};
      
      // Only consider active (non-deleted, non-archived) quotes
      const activeQuotes = quotes.filter(q => !q.is_deleted && !q.is_archived);
      
      activeQuotes.forEach(quote => {
        if (quote.items) {
          quote.items.forEach(item => {
            if (!productStats[item.product_name]) {
              productStats[item.product_name] = {
                name: item.product_name,
                product_id: item.product_id,
                totalQuantity: 0,
                totalValue: 0,
                timesQuoted: 0,
                quotes: []
              };
            }
            productStats[item.product_name].totalQuantity += item.quantity || 0;
            productStats[item.product_name].totalValue += item.line_total || 0;
            productStats[item.product_name].timesQuoted += 1;
            productStats[item.product_name].quotes.push({
              ...quote,
              itemQuantity: item.quantity,
              itemValue: item.line_total
            });
          });
        }
      });

      const sortedProducts = Object.values(productStats)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

      setTopProducts(sortedProducts);
    } catch (error) {
      console.error("Error loading top products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setProductQuotes(product.quotes || []);
    setShowQuotesDialog(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700",
      sent: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700",
      confirmed: "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700",
      accepted: "bg-gradient-to-r from-green-100 to-green-200 text-green-700",
      rejected: "bg-gradient-to-r from-red-100 to-red-200 text-red-700",
      expired: "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700"
    };
    return colors[status] || colors.draft;
  };

  return (
    <>
      <Card className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-700" />
            </div>
            Top Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading || isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="clay-inset bg-white/40 p-4 rounded-2xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-full rounded-xl mb-2" />
                      <Skeleton className="h-3 w-16 rounded-xl" />
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <Skeleton className="h-4 w-16 rounded-xl" />
                  </div>
                </div>
              </div>
            ))
          ) : topProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No product data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {topProducts.map((product, index) => (
                <div 
                  key={product.name} 
                  className="clay-inset bg-white/40 p-4 rounded-2xl hover:bg-white/60 transition-colors cursor-pointer mb-4 last:mb-0"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex justify-between items-center min-w-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-200 to-green-300 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 whitespace-nowrap">
                          {product.name}
                        </p>
                        <p className="text-sm text-slate-500 whitespace-nowrap">
                          {product.timesQuoted} quotes
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-semibold text-slate-800 whitespace-nowrap">
                        €{product.totalValue.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-500 whitespace-nowrap">
                        {product.totalQuantity} units
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Quotes Dialog */}
      <Dialog open={showQuotesDialog} onOpenChange={setShowQuotesDialog}>
        <DialogContent className="clay-shadow border-none rounded-2xl max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                <Package className="w-4 h-4 text-green-700" />
              </div>
              Quotes for "{selectedProduct?.name}"
            </DialogTitle>
            <DialogDescription>
              All quotations containing this product
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-96 space-y-3">
            {productQuotes.map((quote) => (
              <div key={quote.id} className="clay-inset bg-white/40 p-4 rounded-2xl">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{quote.quotation_number}</p>
                    <p className="text-sm text-slate-600">{quote.customer_name || quote.customer_data?.company_name}</p>
                  </div>
                  <Badge className={`${getStatusColor(quote.status)} border-none rounded-full px-3 py-1 text-xs`}>
                    {quote.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-slate-500">Date:</span>
                    <span className="ml-2 text-slate-700">{format(new Date(quote.created_date), 'MMM d, yyyy')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total:</span>
                    <span className="ml-2 font-semibold text-slate-800">€{quote.total?.toFixed(2) || quote.total_amount?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Quantity:</span>
                    <span className="ml-2 text-slate-700">{quote.itemQuantity} units</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Product Value:</span>
                    <span className="ml-2 text-slate-700">€{quote.itemValue?.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Link to={createPageUrl(`QuoteBuilder?id=${quote.id}`)}>
                    <Button size="sm" className="clay-button bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-none rounded-xl hover:from-blue-200 hover:to-blue-300">
                      <ExternalLink className="w-3 h-3 mr-2" />
                      Open Quote
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}