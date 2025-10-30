import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function QuoteSummary({ items, details, setDetails }) {

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0), [items]);
  
  const discountAmount = useMemo(() => {
    if (details.discount_type === 'percentage') {
      return subtotal * (details.discount_value / 100);
    }
    return details.discount_value || 0;
  }, [subtotal, details.discount_type, details.discount_value]);
  
  const taxableTotal = subtotal - discountAmount;
  const taxAmount = taxableTotal * (details.tax_rate / 100);
  const total = taxableTotal + taxAmount;

  const handleDetailsChange = (field, value) => {
    setDetails(prev => ({...prev, [field]: value}));
  };

  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800">Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center text-lg p-3 rounded-2xl clay-inset bg-slate-100/60">
          <span className="font-medium text-slate-600">Untaxed Amount:</span>
          <span className="font-bold text-slate-800">€{subtotal.toFixed(2)}</span>
        </div>
        
        <div className="space-y-3 p-3 rounded-2xl clay-inset bg-white/50">
          <Label className="font-medium text-slate-700">Discount</Label>
          <div className="flex gap-2">
            <Select value={details.discount_type} onValueChange={(v) => handleDetailsChange('discount_type', v)}>
              <SelectTrigger className="clay-inset bg-white/80 border-none rounded-xl h-10 w-2/5">
                <SelectValue/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">€</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" value={details.discount_value} onChange={(e) => handleDetailsChange('discount_value', parseFloat(e.target.value) || 0)} className="clay-inset bg-white/80 border-none rounded-xl h-10"/>
          </div>
          <p className="text-right text-slate-600 text-sm">- €{discountAmount.toFixed(2)}</p>
        </div>

        <div className="space-y-3 p-3 rounded-2xl clay-inset bg-white/50">
          <Label className="font-medium text-slate-700">Tax</Label>
          <div className="flex items-center gap-2">
            <Input type="number" value={details.tax_rate} onChange={(e) => handleDetailsChange('tax_rate', parseFloat(e.target.value) || 0)} className="w-24 clay-inset bg-white/80 border-none rounded-xl h-10"/>
            <span>%</span>
          </div>
          <p className="text-right text-slate-600 text-sm">+ €{taxAmount.toFixed(2)}</p>
        </div>

        <div className="flex justify-between items-center text-2xl p-4 rounded-2xl bg-gradient-to-r from-purple-100 to-blue-100 clay-shadow">
          <span className="font-bold text-slate-800">Total:</span>
          <span className="font-extrabold text-purple-800">€{total.toFixed(2)}</span>
        </div>
        
        <div className="pt-4 space-y-2">
            <Label className="text-slate-700 font-medium">Terms & Conditions</Label>
            <Textarea
              value={details.terms_and_conditions}
              onChange={(e) => handleDetailsChange('terms_and_conditions', e.target.value)}
              className="clay-inset bg-white/60 border-none rounded-2xl"
              rows={3}
            />
        </div>
      </CardContent>
    </Card>
  );
}