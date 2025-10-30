
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Package, Plus, Trash2, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ProductLineItems({ products, lineItems, setLineItems, disabled }) {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const addProduct = (product) => {
    const existingIndex = lineItems.findIndex((item) => item.id === product.id);

    if (existingIndex >= 0) {
      const updatedItems = [...lineItems];
      updatedItems[existingIndex].quantity += 1;
      setLineItems(updatedItems);
    } else {
      setLineItems([...lineItems, {
        ...product,
        quantity: 1,
        unit_price: product.unit_price || 0
      }]);
    }

    setShowProductSelector(false);
    setSearchTerm("");
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...lineItems];
    updatedItems[index][field] = value;
    setLineItems(updatedItems);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const filteredProducts = products.filter((product) =>
  !product.is_archived && (
  product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
              <TableRow className="border-slate-200">
                <TableHead className="text-slate-700 font-semibold" style={{ minWidth: '320px' }}>Product</TableHead>
                <TableHead className="text-slate-700 font-semibold w-24">Quantity</TableHead>
                <TableHead className="text-slate-700 font-semibold w-32">Unit Price</TableHead>
                <TableHead className="text-slate-700 font-semibold w-32">Subtotal</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, index) => (
                <TableRow key={`${item.id}-${index}`} className="border-slate-200">
                  <TableCell className="font-medium text-slate-800">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[320px]">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-slate-600 text-sm">{item.sku}</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm">{item.sku}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="clay-inset bg-white/60 border-none rounded-xl h-10 text-center"
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="clay-inset bg-white/60 border-none rounded-xl h-10"
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-lg text-slate-800">
                      €{(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {lineItems.length === 0 && (
          <div className="text-center py-12 clay-inset bg-white/40 rounded-2xl mt-4">
            <Package className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-500 mb-4">No products added yet</p>
          </div>
        )}

        {/* Add Product Button */}
        {!disabled && (
          <div className="mt-6">
            <Popover open={showProductSelector} onOpenChange={setShowProductSelector}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add a product
                </Button>
              </PopoverTrigger>
              <PopoverContent className="clay-shadow border-none rounded-2xl p-0 w-96" align="start">
                <Command className="rounded-2xl">
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <CommandInput
                      placeholder="Search active products..."
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                  </div>
                  <CommandList className="max-h-64">
                    <CommandEmpty>No active products found.</CommandEmpty>
                    <CommandGroup>
                      {filteredProducts.map((product) => (
                        <CommandItem
                          key={product.id}
                          onSelect={() => addProduct(product)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{product.name}</span>
                            <span className="text-sm text-slate-500">
                              {product.sku} • €{product.unit_price?.toFixed(2)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
