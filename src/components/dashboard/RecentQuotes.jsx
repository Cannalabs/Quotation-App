
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
    <Card className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-700" />
          </div>
          Recent Quotes
        </CardTitle>
        <Link to={createPageUrl("Quotes")}>
          <Button variant="ghost" className="clay-button bg-white/60 text-slate-700 rounded-2xl">
            View All
            <ExternalLink className="w-4 h-4 ml-2" />
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
              <div className="clay-inset bg-white/40 p-4 rounded-2xl hover:bg-white/60 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{quote.quotation_number}</p>
                    <p className="text-sm text-slate-600">{quote.customer_name || quote.customer_data?.company_name}</p>
                  </div>
                  <Badge className={`${getStatusColor(quote.status)} border-none rounded-full px-3 py-1`}>
                    {quote.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">
                    {format(new Date(quote.created_date), 'MMM d, yyyy')}
                  </span>
                  <span className="font-semibold text-slate-800">
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
