import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Product } from "@/api/entities";
import { X, Package, Download, Edit, Euro } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function FilteredProductsList({ title, subtitle, onClose }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await Product.list("-created_date");
      // Filter only active (non-archived) products
      const activeProducts = allProducts.filter(p => !p.is_archived);
      setProducts(activeProducts);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'Price', 'Currency', 'Status'];
    const csvContent = [
      headers.join(','),
      ...products.map(product => [
        `"${product.name || ''}"`,
        product.sku || '',
        product.category || '',
        (product.unit_price || 0).toFixed(2),
        product.currency || 'EUR',
        product.is_active !== false ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalValue = products.reduce((sum, product) => sum + (product.unit_price || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="clay-shadow bg-white border-none rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-700" />
              </div>
              {title}
            </CardTitle>
            <p className="text-slate-600 mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="clay-button bg-white/60 border-none rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="clay-button rounded-xl">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="clay-inset bg-gradient-to-r from-orange-50 to-orange-100 border-none rounded-2xl">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Total Active Products</p>
                  <p className="text-2xl font-bold text-orange-800">{products.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="clay-inset bg-gradient-to-r from-green-50 to-green-100 border-none rounded-2xl">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Catalog Value</p>
                  <p className="text-2xl font-bold text-green-800">€{totalValue.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Table */}
          {isLoading ? (
            <div className="text-center py-12 clay-inset bg-slate-50/60 rounded-2xl">
              <p className="text-slate-500">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 clay-inset bg-slate-50/60 rounded-2xl">
              <Package className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Products Found</h3>
              <p className="text-slate-500">No active products in your catalog</p>
            </div>
          ) : (
            <Card className="clay-inset bg-white/40 border-none rounded-2xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-slate-600">{product.sku}</TableCell>
                      <TableCell>
                        {product.category && (
                          <Badge variant="outline" className="rounded-full">
                            {product.category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <div className="flex items-center justify-end gap-1">
                          <Euro className="w-4 h-4 text-slate-600" />
                          {product.unit_price?.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            product.is_active !== false
                              ? "bg-gradient-to-r from-green-100 to-green-200 text-green-700"
                              : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700"
                          } border-none rounded-full`}
                        >
                          {product.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={createPageUrl("Products")}>
                          <Button size="sm" variant="outline" className="clay-button bg-white/60 text-slate-700 border-none rounded-xl h-9">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}