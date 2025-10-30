import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Percent, Euro } from "lucide-react";

export default function QuotationSummary({ 
  totals, 
  discountType, 
  setDiscountType, 
  discountValue, 
  setDiscountValue,
  disabled
}) {
  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-blue-700" />
          </div>
          Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center p-3 clay-inset bg-white/40 rounded-2xl">
          <span className="font-medium text-slate-700">Subtotal:</span>
          <span className="font-bold text-slate-800">€{totals.subtotal.toFixed(2)}</span>
        </div>

        {/* Discount Section */}
        <div className="space-y-3 p-4 clay-inset bg-white/40 rounded-2xl">
          <Label className="font-semibold text-slate-700 flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Discount
          </Label>
          
          <div className="flex gap-2">
            <Select value={discountType} onValueChange={setDiscountType} disabled={disabled}>
              <SelectTrigger className="clay-inset bg-white/60 border-none rounded-xl h-10 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">€</SelectItem>
              </SelectContent>
            </Select>
            
            {discountType !== "none" && (
              <Input
                type="text"
                inputMode="numeric"
                value={discountValue || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string, numbers, and decimal points
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setDiscountValue(value === "" ? 0 : parseFloat(value) || 0);
                  }
                }}
                className="clay-inset bg-white/60 border-none rounded-xl h-10"
                placeholder={discountType === "percentage" ? "0" : "0.00"}
                disabled={disabled}
                style={{ 
                  MozAppearance: 'textfield',
                  WebkitAppearance: 'none'
                }}
                onWheel={(e) => e.target.blur()} // Prevent scroll wheel from changing value
              />
            )}
          </div>

          {discountType !== "none" && totals.discountAmount > 0 && (
            <div className="text-right text-red-600 font-medium">
              - €{totals.discountAmount.toFixed(2)}
            </div>
          )}
        </div>

        {/* VAT */}
        <div className="flex justify-between items-center p-3 clay-inset bg-white/40 rounded-2xl">
          <span className="font-medium text-slate-700">VAT ({totals.vatRate || 4}%):</span>
          <span className="font-bold text-green-600">€{totals.vatAmount.toFixed(2)}</span>
        </div>

        {/* Total */}
        <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 clay-shadow rounded-2xl">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-slate-800">Total:</span>
            <span className="text-2xl font-extrabold text-purple-800 flex items-center gap-1">
              <Euro className="w-6 h-6" />
              {totals.total.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}