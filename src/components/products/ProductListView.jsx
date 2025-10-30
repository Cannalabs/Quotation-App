import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Edit3, Eye, ArrowUpDown, Trash2, Archive, RotateCcw } from "lucide-react";
import { canDelete, canArchive, canRestore } from "@/utils/permissions";

export default function ProductListView({
  products,
  isLoading,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onRestore,
  onSort,
  sortBy,
  sortOrder,
  showArchiveActions = false,
  showArchived = false,
  showDeleted = false,
  user // Added user prop for permission checking
}) {
  if (isLoading) {
    return (
      <div className="clay-shadow bg-white/60 border-none rounded-3xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {Array(8).fill(0).map((_, i) => (
                <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                {Array(8).fill(0).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const SortableHeader = ({ field, children }) => (
    <TableHead className="cursor-pointer hover:bg-slate-50" onClick={() => onSort(field)}>
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="w-4 h-4 opacity-50" />
      </div>
    </TableHead>
  );

  return (
    <div className="clay-shadow bg-white/60 border-none rounded-3xl overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50 sticky top-0">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedProducts.length === products.length && products.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead className="w-16">Image</TableHead>
            <SortableHeader field="name">Name</SortableHeader>
            <SortableHeader field="sku">SKU</SortableHeader>
            <SortableHeader field="category">Category</SortableHeader>
            <SortableHeader field="unit_price">Price</SortableHeader>
            <TableHead>Status</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.id}
              className="hover:bg-slate-50/50 transition-colors"
            >
              <TableCell>
                <Checkbox
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={(checked) => onSelectProduct(product.id, checked)}
                />
              </TableCell>
              <TableCell>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-700" />
                </div>
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-slate-600">{product.sku}</TableCell>
              <TableCell>
                {product.category && (
                  <Badge variant="outline" className="rounded-full">
                    {product.category}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-semibold">
                €{product.unit_price?.toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge
                  className={`${showArchived
                    ? "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700"
                    : showDeleted
                    ? "bg-gradient-to-r from-red-100 to-red-200 text-red-700"
                    : product.is_active !== false
                      ? "bg-gradient-to-r from-green-100 to-green-200 text-green-700"
                      : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700"
                  } border-none rounded-full`}
                >
                  {showArchived ? "Archived" : showDeleted ? "Deleted" : (product.is_active !== false ? "Active" : "Inactive")}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(product)}
                    className="clay-button bg-white/60 text-slate-700 rounded-xl hover:bg-white/80"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>

                  {showArchived ? (
                    canRestore(user) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onUnarchive(product)}
                        className="clay-button bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )
                  ) : showDeleted ? (
                    canRestore(user) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRestore(product)}
                        className="clay-button bg-green-50 text-green-600 rounded-xl hover:bg-green-100"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )
                  ) : (
                    <>
                      {showArchiveActions && onArchive && canArchive(user) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onArchive(product)}
                          className="clay-button bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && canDelete(user) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(product)}
                          className="clay-button bg-red-50 text-red-600 rounded-xl hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {showArchived ? "No Archived Products" : "No Products Found"}
          </h3>
          <p className="text-slate-500">
            {showArchived ? "Archived products will appear here" : "Start by adding products to your catalog"}
          </p>
        </div>
      )}
    </div>
  );
}