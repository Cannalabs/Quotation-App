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
import { AlertTriangle, Trash2 } from "lucide-react";

export default function DeleteConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  itemCount,
  itemName
}) {
  const isBulk = itemCount > 1;
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="clay-shadow border-none rounded-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-700" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-slate-800">
              {isBulk ? `Delete ${itemCount} Products?` : `Delete "${itemName}"?`}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-600">
            This action cannot be undone. The selected products will be permanently deleted. If a product is part of an existing quotation, it cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="clay-button bg-gradient-to-r from-red-200 to-red-300 text-red-800 border-none rounded-2xl hover:from-red-300 hover:to-red-400"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Yes, Delete {isBulk ? `${itemCount} Products` : 'Product'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}