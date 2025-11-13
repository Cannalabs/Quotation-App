import React, { useState, useEffect } from "react";
import { Product, Quotation } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Upload,
  Search,
  Package,
  Plus,
  FileText,
  Check,
  AlertCircle,
  Archive,
  RotateCcw,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";

import ProductForm from "../components/products/ProductForm";
import ProductGrid from "../components/products/ProductGrid";
import ProductListView from "../components/products/ProductListView";
import CSVUploader from "../components/products/CSVUploader";
import ViewToggle from "../components/shared/ViewToggle";
import BulkActionBar from "../components/shared/BulkActionBar";
import DeleteConfirmDialog from "../components/products/DeleteConfirmDialog";
import ArchiveConfirmDialog from "../components/products/ArchiveConfirmDialog";

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [deletedProducts, setDeletedProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('active');
  const [viewMode, setViewMode] = useState(() =>
    localStorage.getItem('products-view') || 'grid'
  );
  const [showForm, setShowForm] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [sortBy, setSortBy] = useState('created_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productsToDelete, setProductsToDelete] = useState([]);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveAction, setArchiveAction] = useState(null); // 'archive' or 'unarchive'
  const [productsToArchive, setProductsToArchive] = useState([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [productsToRestore, setProductsToRestore] = useState([]);
  const [isRestoring, setIsRestoring] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalArchivedCount, setTotalArchivedCount] = useState(0);
  const [totalDeletedCount, setTotalDeletedCount] = useState(0);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, [activeTab, currentPage, searchTerm]);

  useEffect(() => {
    // Reset to page 1 when tab or search changes
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    localStorage.setItem('products-view', viewMode);
  }, [viewMode]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      
      if (activeTab === 'active') {
        // Load active products with pagination
        const searchQuery = searchTerm ? searchTerm : undefined;
        const activeData = await Product.list({ 
          sort: "-created_date", 
          limit: itemsPerPage, 
          skip: skip,
          q: searchQuery,
          includeDeleted: false 
        });
        const active = activeData.filter(p => !p.archived && !p.deleted);
        setProducts(active);
        setFilteredProducts(active);
        
        // Get total count for active products (fetch first page to estimate, or implement count endpoint)
        if (currentPage === 1 && !searchQuery) {
          // Fetch a larger sample to estimate total
          const sampleData = await Product.list({ 
            sort: "-created_date", 
            limit: 1000, 
            skip: 0,
            includeDeleted: false 
          });
          const activeSample = sampleData.filter(p => !p.archived && !p.deleted);
          setTotalCount(activeSample.length >= 1000 ? activeSample.length + 1 : activeSample.length);
        } else {
          // For search or subsequent pages, estimate based on current data
          setTotalCount(active.length >= itemsPerPage ? (currentPage * itemsPerPage) + 1 : (currentPage - 1) * itemsPerPage + active.length);
        }
      } else if (activeTab === 'archived') {
        // Load archived products with pagination
        const searchQuery = searchTerm ? searchTerm : undefined;
        const activeData = await Product.list({ 
          sort: "-created_date", 
          limit: itemsPerPage, 
          skip: skip,
          q: searchQuery,
          includeDeleted: false 
        });
        const archived = activeData.filter(p => p.archived && !p.deleted);
        setArchivedProducts(archived);
        setFilteredProducts(archived);
        
        if (currentPage === 1 && !searchQuery) {
          const sampleData = await Product.list({ 
            sort: "-created_date", 
            limit: 1000, 
            skip: 0,
            includeDeleted: false 
          });
          const archivedSample = sampleData.filter(p => p.archived && !p.deleted);
          setTotalArchivedCount(archivedSample.length >= 1000 ? archivedSample.length + 1 : archivedSample.length);
        } else {
          setTotalArchivedCount(archived.length >= itemsPerPage ? (currentPage * itemsPerPage) + 1 : (currentPage - 1) * itemsPerPage + archived.length);
        }
      } else if (activeTab === 'deleted') {
        // Load deleted products (no pagination on backend yet, but we'll paginate client-side)
        const deletedData = await Product.listDeleted();
        const filtered = searchTerm 
          ? deletedData.filter(p => 
              p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : deletedData;
        
        const paginated = filtered.slice(skip, skip + itemsPerPage);
        setDeletedProducts(paginated);
        setFilteredProducts(paginated);
        setTotalDeletedCount(filtered.length);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load products" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        await Product.update(editingProduct.id, productData);
        setMessage({ type: "success", text: "Product updated successfully" });
      } else {
        await Product.create(productData);
        setMessage({ type: "success", text: "Product created successfully" });
      }

      setShowForm(false);
      setEditingProduct(null);
      loadProducts();

      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save product" });
    }
  };

  const handleUploadComplete = (uploadedCount) => {
    setMessage({ type: "success", text: `Successfully uploaded ${uploadedCount} products` });
    setShowUploader(false);
    loadProducts();
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteRequest = (productIds) => {
    setProductsToDelete(productIds);
    setShowDeleteDialog(true);
  };

  const handleArchiveRequest = (productIds, action) => {
    setProductsToArchive(productIds);
    setArchiveAction(action);
    setShowArchiveDialog(true);
  };

  const confirmArchive = async () => {
    setShowArchiveDialog(false);
    setIsArchiving(true);

    try {
      // Check if any products are linked to active quotations (only for archive action)
      if (archiveAction === 'archive') {
        const allQuotes = await Quotation.list();
        const activeQuotes = allQuotes.filter(q => !q.is_archived);
        
        let blockedProducts = [];
        
        for (const productId of productsToArchive) {
          const isProductInActiveQuote = activeQuotes.some(quote =>
            quote.items && quote.items.some(item => item.product_id === productId)
          );
          
          if (isProductInActiveQuote) {
            const product = [...products, ...archivedProducts].find(p => p.id === productId);
            blockedProducts.push(product?.name || 'Unknown Product');
          }
        }
        
        if (blockedProducts.length > 0) {
          toast({
            variant: "destructive",
            title: "Archive Blocked",
            description: `Cannot archive: ${blockedProducts.join(', ')}. They are linked to active quotations. Please archive the quotations first.`,
          });
          setIsArchiving(false);
          return;
        }
      }

      // Proceed with archive/unarchive
      for (const productId of productsToArchive) {
        if (archiveAction === 'archive') {
          await Product.update(productId, {
            archived: true
          });
        } else {
          await Product.update(productId, {
            archived: false
          });
        }
      }

      toast({
        title: "Success",
        description: `${archiveAction === 'archive' ? 'Archived' : 'Unarchived'} ${productsToArchive.length} product(s) successfully.`,
      });

      loadProducts();
      setSelectedProducts([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${archiveAction} products.`,
      });
    } finally {
      setIsArchiving(false);
      setProductsToArchive([]);
      setArchiveAction(null);
    }
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);

    // Get all active quotations (non-archived, non-deleted)
    const allQuotes = await Quotation.list();
    const activeQuotes = allQuotes.filter(q => !q.is_deleted && !q.is_archived);
    
    let deletableProducts = [];
    let nonDeletableProducts = [];

    for (const productId of productsToDelete) {
      const isProductInActiveQuote = activeQuotes.some(quote =>
        quote.items && quote.items.some(item => item.product_id === productId)
      );

      if (isProductInActiveQuote) {
        const product = products.find(p => p.id === productId);
        nonDeletableProducts.push(product?.name || 'Unknown Product');
      } else {
        deletableProducts.push(productId);
      }
    }

    if (nonDeletableProducts.length > 0) {
      toast({
        variant: "destructive",
        title: "Deletion Blocked",
        description: `Could not delete: ${nonDeletableProducts.join(', ')}. They are used in active quotations.`,
      });
    }

    if (deletableProducts.length > 0) {
      try {
        for (const productId of deletableProducts) {
          await Product.delete(productId);
        }
        toast({
          title: "Success",
          description: `${deletableProducts.length} product(s) deleted successfully.`,
        });
        loadProducts();
        setSelectedProducts(selectedProducts.filter(id => !deletableProducts.includes(id)));
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An error occurred while deleting products.",
        });
      }
    }

    setProductsToDelete([]);
  };

  const handleRestore = () => {
    setProductsToRestore(selectedProducts);
    setShowRestoreDialog(true);
  };

  const handleIndividualRestore = async (product) => {
    try {
      await Product.restore(product.id);
      toast({
        title: "Success",
        description: `Restored ${product.name} successfully.`,
      });
      loadProducts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to restore product.",
      });
    }
  };

  const confirmRestore = async () => {
    setShowRestoreDialog(false);
    setIsRestoring(true);

    try {
      for (const productId of productsToRestore) {
        await Product.restore(productId);
      }
      toast({
        title: "Success",
        description: `Restored ${productsToRestore.length} product(s) successfully.`,
      });

      loadProducts();
      setSelectedProducts([]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to restore products.",
      });
    } finally {
      setIsRestoring(false);
      setProductsToRestore([]);
    }
  };

  const handleSelectProduct = (productId, checked) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedProducts.length > 0) {
      handleDeleteRequest(selectedProducts);
    }
  };

  const handleBulkArchive = () => {
    if (selectedProducts.length > 0) {
      handleArchiveRequest(selectedProducts, 'archive');
    }
  };

  const handleBulkUnarchive = () => {
    if (selectedProducts.length > 0) {
      handleArchiveRequest(selectedProducts, 'unarchive');
    }
  };

  const handleAddToQuote = () => {
    if (selectedProducts.length === 0) {
      toast({
        variant: "destructive",
        title: "No Products Selected",
        description: "Please select one or more products to add to a quote.",
      });
      return;
    }
    navigate(createPageUrl(`QuoteBuilder?products=${selectedProducts.join(',')}`));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getTotalPages = () => {
    const total = activeTab === 'active' ? totalCount : activeTab === 'archived' ? totalArchivedCount : totalDeletedCount;
    return Math.ceil(total / itemsPerPage);
  };

  const renderPagination = () => {
    const totalPages = getTotalPages();
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return (
      <div className="mt-6 flex justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {startPage > 1 && (
              <>
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setCurrentPage(1)}
                    className="cursor-pointer"
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
                {startPage > 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
              </>
            )}
            
            {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={page === currentPage}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => setCurrentPage(totalPages)}
                    className="cursor-pointer"
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 mb-2">Product Catalog</h1>
            <p className="text-slate-600 text-sm sm:text-base md:text-lg">Manage your product inventory and pricing</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
            <Button
              onClick={() => setShowUploader(!showUploader)}
              className="clay-button bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-none rounded-2xl hover:from-green-200 hover:to-green-300"
            >
              <Upload className="w-5 h-5 mr-2" />
              Import Products
            </Button>
            <Button
              onClick={() => {
                setEditingProduct(null);
                setShowForm(!showForm);
              }}
              className="clay-button bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 border-none rounded-2xl hover:from-purple-300 hover:to-purple-400"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message.text && (
          <Alert variant={message.type === "error" ? "destructive" : "default"} className="clay-shadow border-none rounded-2xl">
            {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription className="font-medium">{message.text}</AlertDescription>
          </Alert>
        )}

        {/* CSV Uploader */}
        {showUploader && (
          <CSVUploader
            onUploadComplete={handleUploadComplete}
            onCancel={() => setShowUploader(false)}
          />
        )}

        {/* Product Form */}
        {showForm && (
          <ProductForm
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => {
              setShowForm(false);
              setEditingProduct(null);
            }}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="clay-shadow bg-white/80 border-none rounded-2xl">
            <TabsTrigger value="active" className="rounded-xl">
              <Package className="w-4 h-4 mr-2" />
              Active Products
              <Badge className="ml-2 bg-blue-100 text-blue-700">
                {totalCount || products.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="archived" className="rounded-xl">
              <Archive className="w-4 h-4 mr-2" />
              Archived
              <Badge className="ml-2 bg-orange-100 text-orange-700">
                {totalArchivedCount || archivedProducts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="deleted" className="rounded-xl">
              <AlertCircle className="w-4 h-4 mr-2" />
              Trash
              <Badge className="ml-2 bg-red-100 text-red-700">
                {totalDeletedCount || deletedProducts.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Stats & Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center clay-shadow">
                <Package className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {activeTab === 'active' ? (totalCount || products.length) : activeTab === 'archived' ? (totalArchivedCount || archivedProducts.length) : (totalDeletedCount || deletedProducts.length)}
                </p>
                <p className="text-slate-600 text-sm">
                  {activeTab === 'active' ? 'Active' : activeTab === 'archived' ? 'Archived' : 'Deleted'} Products
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none md:w-72">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 clay-inset bg-white/60 border-none rounded-2xl h-12 text-slate-700 placeholder-slate-400"
                />
              </div>

              <ViewToggle view={viewMode} onViewChange={setViewMode} />
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedProducts.length > 0 && (
            <div className="flex items-center gap-2 p-4 bg-blue-50/60 clay-shadow rounded-2xl border-2 border-blue-200/50">
              <Badge className="bg-blue-100 text-blue-700 border-none rounded-full px-3 py-1">
                {selectedProducts.length} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProducts([])}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </Button>

              <div className="ml-auto flex items-center gap-2">
                {activeTab === 'active' && (
                  <Button
                    onClick={handleAddToQuote}
                    size="sm"
                    className="clay-button bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-none rounded-xl hover:from-green-200 hover:to-green-300"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Quote
                  </Button>
                )}
                
                {activeTab === 'active' ? (
                  <Button
                    onClick={handleBulkArchive}
                    disabled={isArchiving}
                    size="sm"
                    className="clay-button bg-orange-100 text-orange-700 border-none rounded-xl hover:bg-orange-200"
                  >
                    {isArchiving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                    Archive Selected
                  </Button>
                ) : (
                  <Button
                    onClick={handleBulkUnarchive}
                    disabled={isArchiving}
                    size="sm"
                    className="clay-button bg-blue-100 text-blue-700 border-none rounded-xl hover:bg-blue-200"
                  >
                    {isArchiving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    Unarchive Selected
                  </Button>
                )}

                {activeTab === 'active' && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    size="sm"
                    className="clay-button rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Delete Selected
                  </Button>
                )}

                {activeTab === 'deleted' && (
                  <Button
                    onClick={handleRestore}
                    disabled={isRestoring}
                    size="sm"
                    className="clay-button bg-green-100 text-green-700 border-none rounded-xl hover:bg-green-200"
                  >
                    {isRestoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    Restore Selected
                  </Button>
                )}
              </div>
            </div>
          )}

          <TabsContent value="active">
            {/* Select All */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Checkbox 
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600">Select all on page</span>
              </div>
            )}

            {/* Products Display */}
            {viewMode === 'grid' ? (
              <ProductGrid
                products={filteredProducts}
                isLoading={isLoading}
                selectedProducts={selectedProducts}
                onSelectProduct={handleSelectProduct}
                onSelectAll={handleSelectAll}
                onEdit={handleEdit}
                onDelete={(product) => handleDeleteRequest([product.id])}
                onArchive={(product) => handleArchiveRequest([product.id], 'archive')}
                showArchiveActions={true}
                user={user}
              />
            ) : (
              <ProductListView
                products={filteredProducts}
                isLoading={isLoading}
                selectedProducts={selectedProducts}
                onSelectProduct={handleSelectProduct}
                onSelectAll={handleSelectAll}
                onEdit={handleEdit}
                onDelete={(product) => handleDeleteRequest([product.id])}
                onArchive={(product) => handleArchiveRequest([product.id], 'archive')}
                onSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
                showArchiveActions={true}
                user={user}
              />
            )}
            {renderPagination()}
          </TabsContent>

          <TabsContent value="archived">
            {/* Select All */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Checkbox 
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600">Select all on page</span>
              </div>
            )}

            {/* Products Display */}
            {viewMode === 'grid' ? (
              <ProductGrid
                products={filteredProducts}
                isLoading={isLoading}
                selectedProducts={selectedProducts}
                onSelectProduct={handleSelectProduct}
                onSelectAll={handleSelectAll}
                onEdit={handleEdit}
                onUnarchive={(product) => handleArchiveRequest([product.id], 'unarchive')}
                showArchived={true}
                user={user}
              />
            ) : (
              <ProductListView
                products={filteredProducts}
                isLoading={isLoading}
                selectedProducts={selectedProducts}
                onSelectProduct={handleSelectProduct}
                onSelectAll={handleSelectAll}
                onEdit={handleEdit}
                onUnarchive={(product) => handleArchiveRequest([product.id], 'unarchive')}
                onSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
                showArchived={true}
                user={user}
              />
            )}
            {renderPagination()}
          </TabsContent>

          <TabsContent value="deleted">
            {/* Select All */}
            {filteredProducts.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Checkbox 
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600">Select all on page</span>
              </div>
            )}

            {/* Products Display */}
            {viewMode === 'grid' ? (
              <ProductGrid
                products={filteredProducts}
                isLoading={isLoading}
                selectedProducts={selectedProducts}
                onSelectProduct={handleSelectProduct}
                onSelectAll={handleSelectAll}
                onRestore={handleIndividualRestore}
                showDeleted={true}
                user={user}
              />
            ) : (
              <ProductListView
                products={filteredProducts}
                isLoading={isLoading}
                selectedProducts={selectedProducts}
                onSelectProduct={handleSelectProduct}
                onSelectAll={handleSelectAll}
                onRestore={handleIndividualRestore}
                onSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
                showDeleted={true}
                user={user}
              />
            )}
            {renderPagination()}
          </TabsContent>
        </Tabs>

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={confirmDelete}
          itemCount={productsToDelete.length}
          itemName={products.find(p => p.id === productsToDelete[0])?.name}
        />

        <ArchiveConfirmDialog
          open={showArchiveDialog}
          onOpenChange={setShowArchiveDialog}
          onConfirm={confirmArchive}
          action={archiveAction}
          itemCount={productsToArchive.length}
          itemType="product"
        />

        {/* Restore Confirmation Dialog */}
        <ArchiveConfirmDialog
          open={showRestoreDialog}
          onOpenChange={setShowRestoreDialog}
          onConfirm={confirmRestore}
          action="restore"
          itemCount={productsToRestore.length}
          itemType="product"
        />
      </div>
    </div>
  );
}