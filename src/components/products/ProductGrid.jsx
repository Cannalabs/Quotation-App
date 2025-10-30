
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Edit3, Euro, Trash2, Archive, RotateCcw } from "lucide-react"; // Added Archive, RotateCcw
import { Checkbox } from "@/components/ui/checkbox";
import { canDelete, canArchive, canRestore } from "@/utils/permissions";

export default function ProductGrid({
  products,
  onEdit,
  onDelete,
  onArchive, // Added onArchive prop
  onUnarchive, // Added onUnarchive prop
  onRestore, // Added onRestore prop
  isLoading,
  selectedProducts = [],
  onSelectProduct,
  onSelectAll,
  showArchiveActions = false, // Added showArchiveActions prop
  showArchived = false, // Added showArchived prop
  showDeleted = false, // Added showDeleted prop
  user // Added user prop for permission checking
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array(8).fill(0).map((_, i) => (
          <Card key={i} className="clay-shadow bg-white/60 border-none rounded-3xl">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-3/4 rounded-xl mb-3" />
              <Skeleton className="h-4 w-1/2 rounded-xl mb-4" />
              <Skeleton className="h-4 w-full rounded-xl mb-2" />
              <Skeleton className="h-4 w-2/3 rounded-xl mb-4" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="clay-shadow bg-white/60 border-none rounded-3xl">
        <CardContent className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Products Found</h3>
          <p className="text-slate-500">Start by adding products to your catalog or import from CSV</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Select All Header */}
      {onSelectAll && (
        <div className="flex items-center gap-2 mb-4">
          <Checkbox
            checked={selectedProducts.length === products.length && products.length > 0}
            onCheckedChange={onSelectAll}
          />
          <span className="text-sm text-slate-600">Select all on page ({products.length})</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="clay-shadow bg-gradient-to-br from-white/80 to-slate-50/60 border-none rounded-3xl hover:scale-105 transition-all duration-300 backdrop-blur-sm relative">
            {onSelectProduct && (
              <Checkbox
                className="absolute top-4 left-4 z-10"
                checked={selectedProducts.includes(product.id)}
                onCheckedChange={(checked) => onSelectProduct(product.id, checked)}
              />
            )}
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center clay-shadow">
                  <Package className="w-6 h-6 text-blue-700" />
                </div>
                <Badge
                  // Adjusted variant and className based on showArchived and showDeleted
                  variant={showArchived ? "secondary" : showDeleted ? "destructive" : (product.is_active !== false ? "default" : "secondary")}
                  className={`${showArchived
                    ? "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700" // Specific style for archived
                    : showDeleted
                    ? "bg-gradient-to-r from-red-100 to-red-200 text-red-700" // Specific style for deleted
                    : (product.is_active !== false
                      ? "bg-gradient-to-r from-green-100 to-green-200 text-green-700"
                      : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700"
                    )
                  } border-none rounded-full px-3 py-1`}
                >
                  {showArchived ? "Archived" : showDeleted ? "Deleted" : (product.is_active !== false ? "Active" : "Inactive")}
                </Badge>
              </div>

              <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-1 mt-6">
                {product.name}
              </h3>

              <p className="text-sm text-slate-500 mb-1">SKU: {product.sku}</p>

              {product.category && (
                <p className="text-sm text-slate-600 mb-3">
                  Category: {product.category}
                </p>
              )}

              {product.description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {product.description}
                </p>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-200/50">
                <div className="flex items-center gap-1">
                  <Euro className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-xl text-slate-800">
                    {product.unit_price?.toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">
                    {product.currency || "EUR"}
                  </span>
                </div>

                <div className="flex gap-1">
                  <Button
                    onClick={() => onEdit(product)}
                    variant="ghost"
                    size="icon"
                    className="clay-button bg-white/60 text-slate-700 rounded-xl hover:bg-white/80"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>

                  {showArchived ? (
                    canRestore(user) && (
                      <Button
                        onClick={() => onUnarchive(product)}
                        variant="ghost"
                        size="icon"
                        className="clay-button bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )
                  ) : showDeleted ? (
                    canRestore(user) && (
                      <Button
                        onClick={() => onRestore(product)}
                        variant="ghost"
                        size="icon"
                        className="clay-button bg-green-50 text-green-600 rounded-xl hover:bg-green-100"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )
                  ) : (
                    <>
                      {showArchiveActions && onArchive && canArchive(user) && (
                        <Button
                          onClick={() => onArchive(product)}
                          variant="ghost"
                          size="icon"
                          className="clay-button bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && canDelete(user) && ( // Conditionally render delete button if onDelete prop is provided and user can delete
                        <Button
                          onClick={() => onDelete(product)}
                          variant="ghost"
                          size="icon"
                          className="clay-button bg-red-50 text-red-600 rounded-xl hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
