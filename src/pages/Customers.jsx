import React, { useState, useEffect } from "react";
import { Customer } from "@/api/entities";
import { Plus, Users, Search, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CustomerList from "../components/customers/CustomerList";
import CustomerListView from "../components/customers/CustomerListView";
import CustomerForm from "../components/customers/CustomerForm";
import ViewToggle from "../components/shared/ViewToggle";
import BulkActionBar from "../components/shared/BulkActionBar";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState(() => 
    localStorage.getItem('customers-view') || 'list'
  );
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(c =>
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [customers, searchTerm]);

  useEffect(() => {
    localStorage.setItem('customers-view', viewMode);
  }, [viewMode]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await Customer.list("-created_date");
      setCustomers(data);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load customers" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      if (editingCustomer) {
        await Customer.update(editingCustomer.id, customerData);
        setMessage({ type: "success", text: "Customer updated successfully" });
      } else {
        await Customer.create(customerData);
        setMessage({ type: "success", text: "Customer created successfully" });
      }
      setShowForm(false);
      setEditingCustomer(null);
      loadCustomers();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save customer" });
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleSelectCustomer = (customerId, checked) => {
    if (checked) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    } else {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleBulkDelete = () => {
    console.log('Bulk delete customers:', selectedCustomers);
    setSelectedCustomers([]);
  };

  const handleBulkExport = () => {
    console.log('Export customers:', selectedCustomers);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Customers</h1>
            <p className="text-slate-600 text-lg">Manage your client information</p>
          </div>
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setShowForm(!showForm);
            }}
            className="clay-button bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 border-none rounded-2xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Customer
          </Button>
        </div>

        {message.text && (
          <Alert variant={message.type === "error" ? "destructive" : "default"} className="clay-shadow border-none rounded-2xl">
            {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription className="font-medium">{message.text}</AlertDescription>
          </Alert>
        )}

        <BulkActionBar
          selectedCount={selectedCustomers.length}
          onClear={() => setSelectedCustomers([])}
          onDelete={handleBulkDelete}
          onExport={handleBulkExport}
          showAddToQuote={false}
        />

        {showForm && (
          <CustomerForm
            customer={editingCustomer}
            onSave={handleSaveCustomer}
            onCancel={() => {
              setShowForm(false);
              setEditingCustomer(null);
            }}
          />
        )}

        <div className="flex items-center gap-4 w-full">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by company, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 clay-inset bg-white/60 border-none rounded-2xl h-12 text-slate-700 placeholder-slate-400"
            />
          </div>
          
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
        </div>

        {viewMode === 'grid' ? (
          <CustomerList 
            customers={filteredCustomers} 
            isLoading={isLoading}
            selectedCustomers={selectedCustomers}
            onSelectCustomer={handleSelectCustomer}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit} 
          />
        ) : (
          <CustomerListView
            customers={filteredCustomers}
            isLoading={isLoading}
            selectedCustomers={selectedCustomers}
            onSelectCustomer={handleSelectCustomer}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        )}
      </div>
    </div>
  );
}