import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

export default function QuotationNotes({ notes, setNotes, disabled }) {
  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-700" />
          </div>
          Notes
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <Label className="font-semibold text-slate-700">Additional Notes</Label>
          <Textarea
            value={notes || ""}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes for this quotation..."
            className="clay-inset bg-white/60 border-none rounded-2xl min-h-[120px] resize-none"
            disabled={disabled}
          />
          <p className="text-xs text-slate-500">
            These notes will appear at the bottom of the quotation PDF.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}