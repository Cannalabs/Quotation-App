import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Customer } from "@/api/entities";
import { X, Users, Download, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function FilteredCustomersList({ title, subtitle, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const allCustomers = await Customer.list("-created_date");
      // For now, all customers are considered "active" - you can add filtering logic here
      setCustomers(allCustomers);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Company Name', 'Contact Person', 'Email', 'Phone', 'Country'];
    const csvContent = [
      headers.join(','),
      ...customers.map(customer => [
        `"${customer.company_name || ''}"`,
        `"${customer.contact_person || ''}"`,
        customer.email || '',
        customer.phone || '',
        customer.country || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="clay-shadow bg-white border-none rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-700" />
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
          <div className="mb-6">
            <Card className="clay-inset bg-gradient-to-r from-blue-50 to-blue-100 border-none rounded-2xl">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Active Customers</p>
                  <p className="text-2xl font-bold text-blue-800">{customers.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customers Table */}
          {isLoading ? (
            <div className="text-center py-12 clay-inset bg-slate-50/60 rounded-2xl">
              <p className="text-slate-500">Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 clay-inset bg-slate-50/60 rounded-2xl">
              <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Customers Found</h3>
              <p className="text-slate-500">No active customers in your database</p>
            </div>
          ) : (
            <Card className="clay-inset bg-white/40 border-none rounded-2xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.company_name}</TableCell>
                      <TableCell>{customer.contact_person}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.country}</TableCell>
                      <TableCell>
                        <Link to={createPageUrl("Customers")}>
                          <Button size="sm" variant="outline" className="clay-button bg-white/60 text-slate-700 border-none rounded-xl h-9">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
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