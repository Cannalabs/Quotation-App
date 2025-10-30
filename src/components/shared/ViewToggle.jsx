import React from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

export default function ViewToggle({ view, onViewChange, className = "" }) {
  return (
    <div className={`flex items-center gap-2 p-1 bg-slate-200/50 rounded-2xl clay-inset ${className}`}>
      <Button
        size="icon"
        variant={view === 'grid' ? 'default' : 'ghost'}
        onClick={() => onViewChange('grid')}
        className={`clay-button rounded-xl ${view === 'grid' ? 'bg-white/80' : ''}`}
        aria-label="Grid view"
      >
        <LayoutGrid className="w-5 h-5" />
      </Button>
      <Button
        size="icon"
        variant={view === 'list' ? 'default' : 'ghost'}
        onClick={() => onViewChange('list')}
        className={`clay-button rounded-xl ${view === 'list' ? 'bg-white/80' : ''}`}
        aria-label="List view"
      >
        <List className="w-5 h-5" />
      </Button>
    </div>
  );
}