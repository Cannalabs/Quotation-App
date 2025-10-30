import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Save, Eye, Loader2 } from "lucide-react";

export default function QuoteActions({ onSave, isSaving }) {
  const handlePreview = () => {
    // This functionality would ideally be implemented to show a PDF preview.
    // For now, it can open a new page with a print-friendly layout.
    // window.open(createPageUrl('QuotePrint'), '_blank');
    alert("PDF preview feature coming soon!");
  };

  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
      <CardContent className="p-4 flex flex-col space-y-3">
        <Button onClick={() => onSave('sent')} disabled={isSaving} className="w-full clay-button bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 border-none rounded-2xl h-12 text-base hover:from-purple-300 hover:to-purple-400">
          {isSaving ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : <Send className="w-5 h-5 mr-2" />}
          Save & Send
        </Button>
        <Button onClick={() => onSave('draft')} disabled={isSaving} variant="outline" className="w-full clay-button bg-white/60 text-slate-700 border-none rounded-2xl h-12 text-base">
          {isSaving ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : <Save className="w-5 h-5 mr-2" />}
          Save as Draft
        </Button>
        <Button onClick={handlePreview} variant="outline" className="w-full clay-button bg-white/60 text-slate-700 border-none rounded-2xl h-12 text-base">
          <Eye className="w-5 h-5 mr-2" />
          Preview
        </Button>
      </CardContent>
    </Card>
  );
}