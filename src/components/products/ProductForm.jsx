import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Package, Save, X } from "lucide-react";

export default function ProductForm({ product, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    sku: product?.sku || "",
    unit_price: product?.unit_price || "",
    currency: product?.currency || "EUR",
    category: product?.category || "",
    is_active: product?.is_active !== false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const productData = {
      ...formData,
      unit_price: parseFloat(formData.unit_price) || 0
    };
    
    onSave(productData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
            <Package className="w-5 h-5 text-purple-700" />
          </div>
          {product ? "Edit Product" : "Add New Product"}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Product Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                placeholder="Product SKU/ID"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="clay-inset bg-white/60 border-none rounded-2xl min-h-24"
              placeholder="Product description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Unit Price</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) => handleChange("unit_price", e.target.value)}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => handleChange("currency", value)}>
                <SelectTrigger className="clay-inset bg-white/60 border-none rounded-2xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="clay-shadow border-none rounded-2xl">
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="clay-inset bg-white/60 border-none rounded-2xl h-12"
                placeholder="Product category"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 clay-inset bg-white/40 rounded-2xl">
            <div>
              <Label className="text-slate-700 font-medium">Active Product</Label>
              <p className="text-sm text-slate-500">Available for quotations</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange("is_active", checked)}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl px-6"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="clay-button bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 border-none rounded-2xl px-6 hover:from-purple-300 hover:to-purple-400"
            >
              <Save className="w-4 h-4 mr-2" />
              {product ? "Update" : "Create"} Product
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}