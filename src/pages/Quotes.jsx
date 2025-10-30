
import React, { useState, useEffect } from "react";
import { Quotation } from "@/api/entities";
import { FileText, Search, LayoutGrid, List, Trash2, Archive, RotateCcw, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import QuotesList from "../components/quotes/QuotesList";
import DeleteConfirmDialog from "../components/quotes/DeleteConfirmDialog";

export default function Quotes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [trashedQuotes, setTrashedQuotes] = useState([]);
  const [archivedQuotes, setArchivedQuotes] = useState([]); // New state for archived quotes
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('active');
  const [selectedQuotes, setSelectedQuotes] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // 'single' or 'bulk'
  const [singleQuoteToDelete, setSingleQuoteToDelete] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false); // New state for archive/unarchive loading
  const { toast } = useToast();
  
  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    let quotesToFilter = [];
    if (activeTab === 'active') {
      quotesToFilter = quotes;
    } else if (activeTab === 'trash') {
      quotesToFilter = trashedQuotes;
    } else if (activeTab === 'archived') { // Filter based on archived quotes when tab is active
      quotesToFilter = archivedQuotes;
    }
    
    const filtered = quotesToFilter.filter(q =>
      (q.quotation_number && q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.customer_data?.company_name && q.customer_data.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredQuotes(filtered);
  }, [quotes, trashedQuotes, archivedQuotes, searchTerm, activeTab]); // Add archivedQuotes to dependency array

  const loadQuotes = async () => {
    setIsLoading(true);
    try {
      // Load active quotes (non-deleted, non-archived)
      const activeData = await Quotation.list();
      const active = activeData.filter(q => !q.is_archived);
      setQuotes(active);
      
      // Load deleted quotes separately
      const trashedData = await Quotation.listDeleted();
      setTrashedQuotes(trashedData);
      
      // Load archived quotes (non-deleted, archived)
      const archived = activeData.filter(q => q.is_archived);
      setArchivedQuotes(archived);
    } catch (error) {
      console.error("Failed to load quotes:", error);
      toast({
        title: "Error",
        description: "Failed to load quotations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async (quote) => {
    try {
      await Quotation.update(quote.id, { 
        is_archived: true, 
        archived_at: new Date().toISOString(),
        archived_by: "current_user_email@example.com" // This would be replaced with actual user email/ID
      });
      toast({
        title: "Success",
        description: "Quotation archived successfully"
      });
      loadQuotes();
    } catch (error) {
      console.error("Archive error:", error);
      toast({
        title: "Error",
        description: "Failed to archive quotation",
        variant: "destructive"
      });
    }
  };

  const handleUnarchive = async (quote) => {
    try {
      await Quotation.update(quote.id, { 
        is_archived: false, 
        archived_at: null,
        archived_by: null
      });
      toast({
        title: "Success",
        description: "Quotation unarchived successfully"
      });
      loadQuotes();
    } catch (error) {
      console.error("Unarchive error:", error);
      toast({
        title: "Error",
        description: "Failed to unarchive quotation",
        variant: "destructive"
      });
    }
  };

  const handleBulkArchive = async () => {
    if (selectedQuotes.length === 0) return;
    
    setIsArchiving(true);
    try {
      for (const id of selectedQuotes) {
        await Quotation.update(id, { 
          is_archived: true, 
          archived_at: new Date().toISOString(),
          archived_by: "current_user" // Placeholder
        });
      }
      
      toast({
        title: "Success",
        description: `Archived ${selectedQuotes.length} quotations`
      });
      
      setSelectedQuotes([]);
      loadQuotes();
    } catch (error) {
      console.error("Bulk archive error:", error);
      toast({
        title: "Error",
        description: "Failed to archive quotations",
        variant: "destructive"
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedQuotes.length === 0) return;
    
    setIsArchiving(true);
    try {
      for (const id of selectedQuotes) {
        await Quotation.update(id, { 
          is_archived: false, 
          archived_at: null,
          archived_by: null
        });
      }
      
      toast({
        title: "Success",
        description: `Unarchived ${selectedQuotes.length} quotations`
      });
      
      setSelectedQuotes([]);
      loadQuotes();
    } catch (error) {
      console.error("Bulk unarchive error:", error);
      toast({
        title: "Error",
        description: "Failed to unarchive quotations",
        variant: "destructive"
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleSingleDelete = (quote) => {
    setSingleQuoteToDelete(quote);
    setDeleteTarget('single');
    setShowDeleteDialog(true);
  };

  const handleBulkDelete = () => {
    if (selectedQuotes.length === 0) return;
    setDeleteTarget('bulk');
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteTarget === 'single' && singleQuoteToDelete) {
        // Check if quote can be deleted (only drafts)
        if (singleQuoteToDelete.status !== 'draft') {
          toast({
            title: "Cannot Delete",
            description: "Only draft quotations can be deleted. Please archive or cancel confirmed quotes.",
            variant: "destructive"
          });
          setShowDeleteDialog(false);
          return;
        }

        await Quotation.delete(singleQuoteToDelete.id);
        toast({
          title: "Success",
          description: "Deleted 1 quotation"
        });
        
      } else if (deleteTarget === 'bulk') {
        // Filter only draft quotes for bulk delete
        const quotesToDelete = selectedQuotes.filter(id => {
          const quote = quotes.find(q => q.id === id); // Ensure to find quote from the active list
          return quote && quote.status === 'draft';
        });

        if (quotesToDelete.length === 0) {
          toast({
            title: "Cannot Delete",
            description: "No draft quotations selected. Only draft quotes can be deleted.",
            variant: "destructive"
          });
          setShowDeleteDialog(false);
          return;
        }

        if (quotesToDelete.length < selectedQuotes.length) {
          toast({
            title: "Partial Delete",
            description: `Only ${quotesToDelete.length} draft quotations were deleted. Confirmed quotes cannot be deleted.`,
            variant: "destructive"
          });
        }

        // Perform bulk soft delete
        for (const id of quotesToDelete) {
          await Quotation.delete(id);
        }

        toast({
          title: "Success",
          description: `Deleted ${quotesToDelete.length} quotations`
        });

        setSelectedQuotes([]);
      }

      loadQuotes();
      setShowDeleteDialog(false);
      setSingleQuoteToDelete(null);
      
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete quotations",
        variant: "destructive"
      });
    }
  };

  const handleRestore = async (quote) => {
    try {
      await Quotation.restore(quote.id);
      toast({
        title: "Success",
        description: "Quotation restored successfully"
      });
      loadQuotes();
    } catch (error) {
        toast({
            title: "Error", 
            description: "Failed to restore quotation",
            variant: "destructive"
        });
    }
  };

  const handlePermanentDelete = async (quote) => {
    try {
      await Quotation.delete(quote.id);
      toast({
        title: "Success",
        description: "Quotation permanently deleted"
      });
      loadQuotes();
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to permanently delete quotation", 
            variant: "destructive"
        });
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedQuotes(filteredQuotes.map(q => q.id));
    } else {
      setSelectedQuotes([]);
    }
  };

  const handleSelectQuote = (quoteId, checked) => {
    if (checked) {
      setSelectedQuotes([...selectedQuotes, quoteId]);
    } else {
      setSelectedQuotes(selectedQuotes.filter(id => id !== quoteId));
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Quote History</h1>
          <p className="text-slate-600 text-lg">Review all past quotations</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="clay-shadow bg-white/80 border-none rounded-2xl">
            <TabsTrigger value="active" className="rounded-xl">
              <FileText className="w-4 h-4 mr-2" />
              Active Quotes
              <Badge className="ml-2 bg-blue-100 text-blue-700">
                {quotes.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="archived" className="rounded-xl"> {/* New Archived Tab */}
              <Archive className="w-4 h-4 mr-2" />
              Archived
              <Badge className="ml-2 bg-orange-100 text-orange-700">
                {archivedQuotes.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="trash" className="rounded-xl">
              <Trash2 className="w-4 h-4 mr-2" />
              Trash
              <Badge className="ml-2 bg-red-100 text-red-700">
                {trashedQuotes.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by quote number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 clay-inset bg-white/60 border-none rounded-2xl h-12 text-slate-700 placeholder-slate-400"
              />
            </div>
            
            {/* Bulk Actions */}
            {(activeTab === 'active' || activeTab === 'archived') && selectedQuotes.length > 0 && (
              <div className="flex items-center gap-2 mt-4 md:mt-0"> {/* Added mt-4 md:mt-0 for better spacing on mobile */}
                <span className="text-sm text-slate-600">
                  {selectedQuotes.length} selected
                </span>
                {activeTab === 'active' ? (
                  <>
                    <Button
                      onClick={handleBulkArchive}
                      disabled={isArchiving}
                      size="sm"
                      className="clay-button bg-orange-100 text-orange-700 border-none rounded-xl hover:bg-orange-200"
                    >
                      {isArchiving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                      Archive Selected
                    </Button>
                    <Button
                      onClick={handleBulkDelete}
                      variant="destructive"
                      size="sm"
                      className="clay-button rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  </>
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
              </div>
            )}
            
            {/* View Toggle */}
            {(activeTab === 'active' || activeTab === 'archived') && (
              <div className="flex items-center gap-2 p-1 bg-slate-200/50 rounded-2xl clay-inset mt-4 md:mt-0"> {/* Added mt-4 md:mt-0 for better spacing on mobile */}
                <Button 
                  size="icon" 
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('grid')}
                  className={`clay-button rounded-xl ${viewMode === 'grid' ? 'bg-white/80' : ''}`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </Button>
                <Button 
                  size="icon" 
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className={`clay-button rounded-xl ${viewMode === 'list' ? 'bg-white/80' : ''}`}
                >
                  <List className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="active">
            {/* Show select all checkbox only for active quotes and if there are quotes to select */}
            {activeTab === 'active' && filteredQuotes.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Checkbox 
                  checked={selectedQuotes.length === filteredQuotes.length && filteredQuotes.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600">Select all on page</span>
              </div>
            )}
            
            <QuotesList 
              quotes={filteredQuotes} 
              isLoading={isLoading} 
              viewMode={viewMode}
              showTrash={false}
              selectedQuotes={selectedQuotes}
              onSelectQuote={handleSelectQuote}
              onDelete={handleSingleDelete}
              onArchive={handleArchive}
              user={user}
            />
          </TabsContent>

          <TabsContent value="archived">
            {activeTab === 'archived' && filteredQuotes.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Checkbox 
                  checked={selectedQuotes.length === filteredQuotes.length && filteredQuotes.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600">Select all on page</span>
              </div>
            )}
            
            <QuotesList 
              quotes={filteredQuotes} 
              isLoading={isLoading} 
              viewMode={viewMode}
              showArchived={true}
              selectedQuotes={selectedQuotes}
              onSelectQuote={handleSelectQuote}
              onUnarchive={handleUnarchive}
              user={user}
            />
          </TabsContent>

          <TabsContent value="trash">
            <QuotesList 
              quotes={filteredQuotes} 
              isLoading={isLoading} 
              viewMode={viewMode}
              showTrash={true}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
              user={user}
            />
          </TabsContent>
        </Tabs>

        <DeleteConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={confirmDelete}
          deleteTarget={deleteTarget}
          quoteCount={deleteTarget === 'bulk' ? selectedQuotes.length : 1}
          quoteName={singleQuoteToDelete?.quotation_number}
        />
      </div>
    </div>
  );
}
