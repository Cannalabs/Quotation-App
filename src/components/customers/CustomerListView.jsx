import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Edit3, Mail, Phone, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

export default function CustomerListView({ 
  customers, 
  isLoading, 
  selectedCustomers, 
  onSelectCustomer, 
  onSelectAll,
  onEdit,
  onSort,
  sortBy,
  sortOrder 
}) {
  if (isLoading) {
    return (
      <div className="clay-shadow bg-white/60 border-none rounded-3xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {Array(9).fill(0).map((_, i) => (
                <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                {Array(9).fill(0).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const SortableHeader = ({ field, children }) => (
    <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => onSort(field)}>
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="w-4 h-4 opacity-50" />
      </div>
    </TableHead>
  );

  const getOpportunityColor = (level) => {
    const colors = {
      high: "bg-green-500",
      medium: "bg-yellow-500",
      low: "bg-red-500"
    };
    return colors[level] || "bg-gray-300";
  };

  return (
    <div className="clay-shadow bg-white/60 border-none rounded-3xl overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50 sticky top-0">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selectedCustomers.length === customers.length && customers.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead className="w-16">Opportunity</TableHead>
            <SortableHeader field="company_name">Company</SortableHeader>
            <SortableHeader field="contact_person">Contact</SortableHeader>
            <SortableHeader field="email">Email</SortableHeader>
            <TableHead>Phone</TableHead>
            <SortableHeader field="source">Source</SortableHeader>
            <SortableHeader field="country">Country</SortableHeader>
            <TableHead>VAT Number</TableHead>
            <SortableHeader field="created_date">Created</SortableHeader>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow 
              key={customer.id} 
              className="hover:bg-slate-50/50 transition-colors"
            >
              <TableCell>
                <Checkbox 
                  checked={selectedCustomers.includes(customer.id)}
                  onCheckedChange={(checked) => onSelectCustomer(customer.id, checked)}
                />
              </TableCell>
              <TableCell>
                <div className="flex justify-center">
                  <div 
                    className={`w-4 h-4 rounded-full ${getOpportunityColor(customer.opportunity)}`}
                    title={customer.opportunity ? `${customer.opportunity.charAt(0).toUpperCase() + customer.opportunity.slice(1)} Opportunity` : 'No opportunity set'}
                  />
                </div>
              </TableCell>
              <TableCell className="font-medium">{customer.company_name}</TableCell>
              <TableCell>{customer.contact_person}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {customer.email}
                </div>
              </TableCell>
              <TableCell>
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {customer.phone}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {customer.source && (
                  <Badge variant="outline" className="rounded-full bg-blue-50 text-blue-700 border-blue-200">
                    {customer.source}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {customer.country && (
                  <Badge variant="outline" className="rounded-full">
                    {customer.country}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-slate-600 text-sm">{customer.vat_number}</TableCell>
              <TableCell className="text-slate-600 text-sm">
                {customer.created_date && format(new Date(customer.created_date), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(customer)}
                  className="clay-button bg-white/60 text-slate-700 rounded-xl hover:bg-white/80"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {customers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Customers Found</h3>
          <p className="text-slate-500">Add your first customer to get started</p>
        </div>
      )}
    </div>
  );
}