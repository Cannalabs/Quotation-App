import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Users, Edit3, Mail, Phone, MapPin, Tag } from "lucide-react";

export default function CustomerList({ 
  customers, 
  onEdit, 
  isLoading, 
  selectedCustomers = [], 
  onSelectCustomer, 
  onSelectAll 
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <Card className="clay-shadow bg-white/60 border-none rounded-3xl text-center p-12">
        <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Customers Found</h3>
        <p className="text-slate-500">Add your first customer to get started.</p>
      </Card>
    );
  }

  const getOpportunityColor = (level) => {
    const colors = {
      high: "bg-green-500",
      medium: "bg-yellow-500",
      low: "bg-red-500"
    };
    return colors[level] || "bg-gray-300";
  };

  return (
    <>
      {/* Select All Header */}
      {onSelectAll && (
        <div className="flex items-center gap-2 mb-4">
          <Checkbox 
            checked={selectedCustomers.length === customers.length && customers.length > 0}
            onCheckedChange={onSelectAll}
          />
          <span className="text-sm text-slate-600">Select all on page ({customers.length})</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customers.map((customer) => (
          <Card key={customer.id} className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl backdrop-blur-sm relative">
            {onSelectCustomer && (
              <Checkbox 
                className="absolute top-4 left-4 z-10"
                checked={selectedCustomers.includes(customer.id)}
                onCheckedChange={(checked) => onSelectCustomer(customer.id, checked)}
              />
            )}
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full clay-shadow bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <div 
                      className={`w-6 h-6 rounded-full ${getOpportunityColor(customer.opportunity)}`}
                      title={customer.opportunity ? `${customer.opportunity.charAt(0).toUpperCase() + customer.opportunity.slice(1)} Opportunity` : 'No opportunity set'}
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="font-bold text-xl text-slate-800">{customer.company_name}</h3>
                    <p className="text-slate-600">{customer.contact_person}</p>
                    {customer.source && (
                      <Badge variant="outline" className="mt-2 rounded-full bg-blue-50 text-blue-700 border-blue-200 text-xs">
                        {customer.source}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => onEdit(customer)} 
                  variant="ghost" 
                  size="sm" 
                  className="clay-button bg-white/60 text-slate-700 rounded-2xl hover:bg-white/80"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 text-sm text-slate-700 mt-6">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span>{customer.email}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.country && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{customer.country}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}