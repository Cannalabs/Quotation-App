import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, RotateCcw } from "lucide-react";

export default function ArchiveConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  action, // 'archive' or 'unarchive'
  itemCount,
  itemType // 'product' or 'quotation'
}) {
  const isBulk = itemCount > 1;
  const isArchive = action === 'archive';
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="clay-shadow border-none rounded-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isArchive 
                ? 'bg-gradient-to-br from-orange-100 to-orange-200' 
                : 'bg-gradient-to-br from-blue-100 to-blue-200'
            }`}>
              {isArchive ? (
                <Archive className="w-5 h-5 text-orange-700" />
              ) : (
                <RotateCcw className="w-5 h-5 text-blue-700" />
              )}
            </div>
            <AlertDialogTitle className="text-xl font-bold text-slate-800">
              {isArchive ? 'Archive' : 'Unarchive'} {isBulk ? `${itemCount} ${itemType}s` : `${itemType}`}?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-600">
            {isArchive ? (
              <>
                {isBulk ? `These ${itemType}s` : `This ${itemType}`} will be removed from active views but still available under 'Archived'. 
                {itemType === 'product' && ' Archived products cannot be added to new quotations unless unarchived.'}
              </>
            ) : (
              `${isBulk ? `These ${itemType}s` : `This ${itemType}`} will be made active again and visible in all views.`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={`clay-button border-none rounded-2xl ${
              isArchive 
                ? 'bg-gradient-to-r from-orange-200 to-orange-300 text-orange-800 hover:from-orange-300 hover:to-orange-400'
                : 'bg-gradient-to-r from-blue-200 to-blue-300 text-blue-800 hover:from-blue-300 hover:to-blue-400'
            }`}
          >
            {isArchive ? <Archive className="w-4 h-4 mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Yes, {isArchive ? 'Archive' : 'Unarchive'} {isBulk ? `${itemCount} ${itemType}s` : itemType}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}