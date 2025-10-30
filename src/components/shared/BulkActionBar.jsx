import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Download, Plus } from "lucide-react";

export default function BulkActionBar({ 
  selectedCount, 
  onClear, 
  onDelete, 
  onExport, 
  onAddToQuote,
  showAddToQuote = false,
  className = "" 
}) {
  if (selectedCount === 0) return null;

  return (
    <div className={`flex items-center justify-between p-4 bg-blue-50/60 clay-shadow rounded-2xl border-2 border-blue-200/50 ${className}`}>
      <div className="flex items-center gap-3">
        <Badge className="bg-blue-100 text-blue-700 border-none rounded-full px-3 py-1">
          {selectedCount} selected
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-blue-600 hover:text-blue-800"
        >
          Clear selection
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        {showAddToQuote && (
          <Button
            onClick={onAddToQuote}
            size="sm"
            className="clay-button bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-none rounded-xl hover:from-green-200 hover:to-green-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Quote
          </Button>
        )}
        <Button
          onClick={onExport}
          variant="outline"
          size="sm"
          className="clay-button bg-white/60 text-slate-700 border-none rounded-xl"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        <Button
          onClick={onDelete}
          variant="destructive"
          size="sm"
          className="clay-button bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-none rounded-xl hover:from-red-200 hover:to-red-300"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}