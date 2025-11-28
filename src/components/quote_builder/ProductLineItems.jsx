
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
import { useCompanySettings } from "@/contexts/CompanySettingsContext";

export default function ProductLineItems({ products, lineItems, setLineItems, disabled }) {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { companySettings } = useCompanySettings();
  const defaultVatRate = companySettings?.default_vat_rate ?? 4;

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
        unit_price: product.unit_price || 0,
        vat_rate: product.vat_rate || null
      }]);
    }

    setShowProductSelector(false);
    setSearchTerm("");
  };

  const updateLineItem = (index, field, value) => {
    const updatedItems = [...lineItems];
    // Ensure quantity is always a number >= 1
    if (field === 'quantity') {
      updatedItems[index][field] = (value === '' || value == null) ? 1 : Math.max(1, parseInt(value, 10) || 1);
    }
    // Ensure unit_price is always a number >= 0
    else if (field === 'unit_price') {
      updatedItems[index][field] = (value === '' || value == null || value === '.') ? 0 : Math.max(0, parseFloat(value) || 0);
    }
    // Ensure vat_rate is a number between 0 and 100 or null/empty (allows decimals when typed)
    else if (field === 'vat_rate') {
      updatedItems[index][field] = (value === '' || value == null) ? null : Math.min(100, Math.max(0, parseFloat(value) || 0));
    }
    else {
      updatedItems[index][field] = value;
    }
    setLineItems(updatedItems);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const filteredProducts = products.filter((product) => {
    // Exclude archived and deleted products
    if (product.is_archived || product.deleted) return false;
    
    // If no search term, show all active products
    if (!searchTerm.trim()) return true;
    
    // Filter by search term (name or SKU)
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm w-full min-w-0">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
            <Package className="w-5 h-5 text-green-700" />
          </div>
          Order Lines
        </CardTitle>
      </CardHeader>
      
      <CardContent className="w-full min-w-0 overflow-hidden">
        {/* Mobile Card View */}
        <div className="block md:hidden space-y-4">
          {lineItems.map((item, index) => (
            <div key={`${item.id}-${index}`} className="clay-shadow bg-white/60 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                  <p className="text-sm text-slate-600">{item.sku}</p>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={String(item.quantity ?? 1)}
                    onChange={(e) => {
                      const inputVal = e.target.value;
                      const val = parseInt(inputVal, 10);
                      if (inputVal === '') {
                        const updatedItems = [...lineItems];
                        updatedItems[index].quantity = '';
                        setLineItems(updatedItems);
                      } else if (!isNaN(val) && val >= 1) {
                        updateLineItem(index, 'quantity', val);
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateLineItem(index, 'quantity', isNaN(val) || val < 1 ? 1 : val);
                    }}
                    className="clay-inset bg-white/80 border-none rounded-xl h-10 text-center"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Unit Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price != null ? String(item.unit_price) : '0'}
                    onChange={(e) => {
                      const inputVal = e.target.value;
                      if (inputVal === '' || inputVal === '.') {
                        const updatedItems = [...lineItems];
                        updatedItems[index].unit_price = inputVal;
                        setLineItems(updatedItems);
                      } else {
                        const val = parseFloat(inputVal);
                        if (!isNaN(val) && val >= 0) {
                          updateLineItem(index, 'unit_price', val);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const inputVal = e.target.value;
                      if (inputVal === '' || inputVal === '.') {
                        updateLineItem(index, 'unit_price', 0);
                      } else {
                        const val = parseFloat(inputVal);
                        updateLineItem(index, 'unit_price', isNaN(val) || val < 0 ? 0 : val);
                      }
                    }}
                    className="clay-inset bg-white/80 border-none rounded-xl h-10"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">VAT Rate (%)</label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={item.vat_rate != null ? String(item.vat_rate) : ''}
                    onChange={(e) => {
                      const inputVal = e.target.value;
                      // Allow decimal input when typing, but step="any" allows decimals while arrows increment by 1
                      if (inputVal === '' || inputVal === '.') {
                        const updatedItems = [...lineItems];
                        updatedItems[index].vat_rate = inputVal;
                        setLineItems(updatedItems);
                      } else {
                        const val = parseFloat(inputVal);
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          updateLineItem(index, 'vat_rate', val);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const inputVal = e.target.value;
                      if (inputVal === '' || inputVal === '.') {
                        updateLineItem(index, 'vat_rate', null);
                      } else {
                        const val = parseFloat(inputVal);
                        if (isNaN(val) || val < 0 || val > 100) {
                          updateLineItem(index, 'vat_rate', null);
                        } else {
                          updateLineItem(index, 'vat_rate', val);
                        }
                      }
                    }}
                    className="clay-inset bg-white/80 border-none rounded-xl h-10"
                    placeholder={String(defaultVatRate)}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Subtotal</label>
                  <div className="font-bold text-lg text-slate-800 h-10 flex items-center">
                    €{(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block w-full min-w-0">
          <div className="w-full overflow-hidden">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="h-9 px-2 text-left align-middle font-semibold text-slate-700 text-xs" style={{ width: '28%' }}>Product</th>
                  <th className="h-9 px-2 text-left align-middle font-semibold text-slate-700 text-xs" style={{ width: '12%' }}>Quantity</th>
                  <th className="h-9 px-2 text-left align-middle font-semibold text-slate-700 text-xs" style={{ width: '15%' }}>Unit Price</th>
                  <th className="h-9 px-2 text-left align-middle font-semibold text-slate-700 text-xs" style={{ width: '12%' }}>VAT Rate (%)</th>
                  <th className="h-9 px-2 text-left align-middle font-semibold text-slate-700 text-xs" style={{ width: '15%' }}>Subtotal</th>
                  <th className="h-9 px-1 text-center align-middle font-semibold text-slate-700 text-xs" style={{ width: '6%' }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={`${item.id}-${index}`} className="border-b border-slate-200">
                    <td className="p-2 align-middle font-medium text-slate-800 text-sm" style={{ width: '28%' }}>
                      <div className="pr-2">
                        <p className="font-semibold break-words leading-tight text-xs">{item.name}</p>
                        <p className="text-slate-600 text-xs break-words leading-tight">{item.sku}</p>
                      </div>
                    </td>
                    <td className="p-2 align-middle" style={{ width: '12%' }}>
                      <Input
                        type="number"
                        min="1"
                        value={String(item.quantity ?? 1)}
                        onChange={(e) => {
                          const inputVal = e.target.value;
                          const val = parseInt(inputVal, 10);
                          if (inputVal === '') {
                            const updatedItems = [...lineItems];
                            updatedItems[index].quantity = '';
                            setLineItems(updatedItems);
                          } else if (!isNaN(val) && val >= 1) {
                            updateLineItem(index, 'quantity', val);
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateLineItem(index, 'quantity', isNaN(val) || val < 1 ? 1 : val);
                        }}
                        className="clay-inset bg-white/60 border-none rounded-xl h-9 text-center w-full text-sm"
                        disabled={disabled}
                      />
                    </td>
                    <td className="p-2 align-middle" style={{ width: '15%' }}>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price != null ? String(item.unit_price) : '0'}
                        onChange={(e) => {
                          const inputVal = e.target.value;
                          // Allow empty or decimal point during typing
                          if (inputVal === '' || inputVal === '.') {
                            const updatedItems = [...lineItems];
                            updatedItems[index].unit_price = inputVal;
                            setLineItems(updatedItems);
                          } else {
                            const val = parseFloat(inputVal);
                            if (!isNaN(val) && val >= 0) {
                              updateLineItem(index, 'unit_price', val);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const inputVal = e.target.value;
                          if (inputVal === '' || inputVal === '.') {
                            updateLineItem(index, 'unit_price', 0);
                          } else {
                            const val = parseFloat(inputVal);
                            updateLineItem(index, 'unit_price', isNaN(val) || val < 0 ? 0 : val);
                          }
                        }}
                        className="clay-inset bg-white/60 border-none rounded-xl h-9 w-full text-sm"
                        disabled={disabled}
                      />
                    </td>
                    <td className="p-2 align-middle" style={{ width: '12%' }}>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={item.vat_rate != null ? String(item.vat_rate) : ''}
                        onChange={(e) => {
                          const inputVal = e.target.value;
                          // Allow decimal input when typing, but step="any" allows decimals while arrows increment by 1
                          if (inputVal === '' || inputVal === '.') {
                            const updatedItems = [...lineItems];
                            updatedItems[index].vat_rate = inputVal;
                            setLineItems(updatedItems);
                          } else {
                            const val = parseFloat(inputVal);
                            if (!isNaN(val) && val >= 0 && val <= 100) {
                              updateLineItem(index, 'vat_rate', val);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const inputVal = e.target.value;
                          if (inputVal === '' || inputVal === '.') {
                            updateLineItem(index, 'vat_rate', null);
                          } else {
                            const val = parseFloat(inputVal);
                            if (isNaN(val) || val < 0 || val > 100) {
                              updateLineItem(index, 'vat_rate', null);
                            } else {
                              updateLineItem(index, 'vat_rate', val);
                            }
                          }
                        }}
                        className="clay-inset bg-white/60 border-none rounded-xl h-9 w-full text-sm"
                        placeholder={String(defaultVatRate)}
                        disabled={disabled}
                      />
                    </td>
                    <td className="p-2 align-middle" style={{ width: '15%' }}>
                      <div className="font-bold text-sm text-slate-800 whitespace-nowrap">
                        €{((item.quantity || 1) * (typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price) || 0)).toFixed(2)}
                      </div>
                    </td>
                    <td className="p-1 align-middle text-center" style={{ width: '7%' }}>
                      {!disabled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl h-8 w-8"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {lineItems.length === 0 && (
          <div className="text-center py-12 clay-inset bg-white/40 rounded-2xl mt-4">
            <Package className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-500 mb-4">No products added yet</p>
          </div>
        )}

        {/* Add Product Button */}
        {!disabled && (
          <div className="mt-4 sm:mt-6">
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
                  <CommandList className="max-h-96 overflow-y-auto">
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
