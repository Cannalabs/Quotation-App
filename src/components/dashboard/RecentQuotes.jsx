
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { FileText, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentQuotes({ quotes, isLoading }) {
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
    <Card className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl backdrop-blur-sm w-full min-w-0">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-3 sm:gap-0">
        <CardTitle className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
          </div>
          <span className="truncate">Recent Quotes</span>
        </CardTitle>
        <Link to={createPageUrl("Quotes")} className="self-start sm:self-auto">
          <Button variant="ghost" size="sm" className="clay-button bg-white/60 text-slate-700 rounded-2xl text-xs sm:text-sm">
            View All
            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="clay-inset bg-white/40 p-4 rounded-2xl">
              <div className="flex justify-between items-start mb-3">
                <Skeleton className="h-5 w-32 rounded-xl" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-24 rounded-xl mb-2" />
              <Skeleton className="h-4 w-20 rounded-xl" />
            </div>
          ))
        ) : quotes.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No quotes created yet</p>
            <Link to={createPageUrl("QuoteBuilder")} className="mt-4 inline-block">
              <Button className="clay-button bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 rounded-2xl">
                Create Your First Quote
              </Button>
            </Link>
          </div>
        ) : (
          quotes.map((quote) => (
            <Link 
              key={quote.id} 
              to={createPageUrl(`QuoteBuilder?id=${quote.id}`)}
              className="block"
            >
              <div className="clay-inset bg-white/40 p-3 sm:p-4 rounded-2xl hover:bg-white/60 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-sm sm:text-base">{quote.quotation_number}</p>
                    <p className="text-xs sm:text-sm text-slate-600 truncate">{quote.customer_name || quote.customer_data?.company_name}</p>
                  </div>
                  <Badge className={`${getStatusColor(quote.status)} border-none rounded-full px-2 sm:px-3 py-1 text-xs flex-shrink-0`}>
                    {quote.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                  <span className="text-slate-500 truncate">
                    {format(new Date(quote.created_date), 'MMM d, yyyy')}
                  </span>
                  <span className="font-semibold text-slate-800 flex-shrink-0 ml-2">
                    €{quote.total?.toLocaleString() || quote.total_amount?.toLocaleString()}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
