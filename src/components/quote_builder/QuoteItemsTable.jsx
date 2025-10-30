import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Package, Trash2, Plus } from "lucide-react";

export default function QuoteItemsTable({ products, quoteItems, setQuoteItems }) {
  const [showProductSearch, setShowProductSearch] = useState(false);

  const addProduct = (product) => {
    const existingItem = quoteItems.find(item => item.id === product.id);
    if (existingItem) {
      setQuoteItems(quoteItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setQuoteItems([...quoteItems, { ...product, quantity: 1 }]);
    }
    setShowProductSearch(false);
  };
  
  const updateItem = (productId, field, value) => {
    setQuoteItems(quoteItems.map(item =>
      item.id === productId ? { ...item, [field]: value } : item
    ));
  };
  
  const removeItem = (productId) => {
    setQuoteItems(quoteItems.filter(item => item.id !== productId));
  };

  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
            <Package className="w-5 h-5 text-green-700" />
          </div>
          Order Lines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quoteItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-slate-800">{item.name}</TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-20 clay-inset bg-white/60 border-none rounded-xl h-10"
                      min="1"
                    />
                  </TableCell>
                  <TableCell>€{item.unit_price.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">€{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4">
          {!showProductSearch ? (
            <Button variant="outline" onClick={() => setShowProductSearch(true)} className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl">
              <Plus className="w-4 h-4 mr-2"/> Add a product
            </Button>
          ) : (
            <Command className="clay-inset bg-white/60 rounded-2xl">
              <CommandInput placeholder="Search product..." />
              <CommandList>
                <CommandEmpty>No product found.</CommandEmpty>
                {products.map((product) => (
                  <CommandItem key={product.id} onSelect={() => addProduct(product)} className="cursor-pointer">
                    {product.name}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          )}
        </div>
      </CardContent>
    </Card>
  );
}