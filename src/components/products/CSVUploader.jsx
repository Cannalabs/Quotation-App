import React, { useState, useRef } from "react";
import { Product } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, X, Check, AlertCircle, Download } from "lucide-react";

export default function CSVUploader({ onUploadComplete, onCancel }) {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === "text/csv" || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile);
      setError(null);
      setResults(null);
    } else {
      setError("Please select a valid CSV file.");
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'productcode,productdescription,price,"Product Category"\nP24016353,"Calendar CANNA 2026",0,"Other / Promo"\n0130050,"CANNA Terra Professional Plus 50L",12.52,"Medium / Medium TERRA"';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const downloadErrorLog = () => {
    if (!results || !results.errorDetails || results.errorDetails.length === 0) return;
    
    let csvContent = "row,error_message\n";
    results.errorDetails.forEach(err => {
      csvContent += `${err.row},"${err.message.replace(/"/g, '""')}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import_error_log.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processCSV = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResults(null);

    try {
      const allProducts = await Product.list();
      const productSkuMap = new Map(allProducts.map(p => [p.sku, p]));
      
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(line => line);
      
      if (lines.length < 2) {
        throw new Error("CSV file must contain a header and at least one data row.");
      }

      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/"/g, ''));
      
      const requiredHeaders = ['productcode', 'productdescription', 'price'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}.`);
      }

      const productsToCreate = [];
      const productsToUpdate = [];
      const processingErrors = [];
      const totalRows = lines.length - 1;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/(^"|"$)/g, ''));
        
        if (values.length > headers.length) {
            // handle comma in last field
            const lastField = values.slice(headers.length - 1).join(',');
            values.splice(headers.length - 1, values.length, lastField);
        }

        const rowData = headers.reduce((obj, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {});
        
        if (!rowData.productcode || !rowData.productdescription || !rowData.price) {
          processingErrors.push({ row: i + 1, message: "Missing required field(s). Ensure productcode, productdescription, and price are present." });
          continue;
        }

        const price = parseFloat(String(rowData.price).replace(',', '.'));
        if (isNaN(price)) {
          processingErrors.push({ row: i + 1, message: `Invalid price format: '${rowData.price}'` });
          continue;
        }

        const payload = {
          name: rowData.productdescription,
          description: rowData.productdescription,
          sku: rowData.productcode,
          unit_price: price,
          category: rowData['product category'] || "",
          is_active: true,
          currency: 'EUR'
        };

        if (productSkuMap.has(payload.sku)) {
          const existingProduct = productSkuMap.get(payload.sku);
          productsToUpdate.push({ id: existingProduct.id, data: payload });
        } else {
          productsToCreate.push(payload);
        }
        setProgress(((i) / totalRows) * 100);
      }

      if (productsToCreate.length > 0) {
        for (const product of productsToCreate) {
          await Product.create(product);
        }
      }
      if (productsToUpdate.length > 0) {
        for (const p of productsToUpdate) {
          await Product.update(p.id, p.data);
        }
      }

      setResults({
        created: productsToCreate.length,
        updated: productsToUpdate.length,
        errors: processingErrors.length,
        errorDetails: processingErrors
      });

      if (productsToCreate.length > 0 || productsToUpdate.length > 0) {
        onUploadComplete(productsToCreate.length + productsToUpdate.length);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="clay-shadow bg-gradient-to-br from-white/90 to-slate-50/70 border-none rounded-3xl backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
            <Upload className="w-5 h-5 text-green-700" />
          </div>
          Import Products
        </CardTitle>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="icon"
          className="clay-button bg-white/60 text-slate-700 rounded-2xl"
        >
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="clay-inset bg-blue-50/60 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800 mb-1">Download Template</h3>
              <p className="text-sm text-blue-600">Use our CSV template with the required 4 columns.</p>
              <p className="text-xs text-blue-500 mt-1">Note: XLSX format is not supported, please save as CSV.</p>
            </div>
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="clay-button bg-white/60 text-blue-700 border-blue-200 rounded-2xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div 
            className="clay-inset bg-white/40 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:bg-white/60 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <FileText className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-lg font-semibold text-slate-700 mb-2">
              {file ? file.name : "Select CSV file"}
            </p>
            <p className="text-slate-500">
              Click to browse or drag and drop your file here
            </p>
          </div>

          {file && (
            <div className="clay-inset bg-white/40 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-slate-700">{file.name}</span>
                  <Badge className="bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-none rounded-full">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <Button
                  onClick={() => setFile(null)}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Processing file...</span>
              <span className="text-sm text-slate-500">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="clay-shadow border-none rounded-2xl bg-red-50/60">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <Alert className={`clay-shadow border-none rounded-2xl ${results.errors > 0 ? 'bg-orange-50/60' : 'bg-green-50/60'}`}>
            {results.errors === 0 ? <Check className="h-4 w-4 text-green-700" /> : <AlertCircle className="h-4 w-4 text-orange-700" />}
            <AlertDescription>
              <div className="font-medium text-slate-800">
                Import complete. Created: {results.created}, Updated: {results.updated}, Skipped: {results.errors}.
              </div>
              {results.errors > 0 && (
                <div className="mt-2">
                  <Button onClick={downloadErrorLog} size="sm" variant="link" className="text-blue-600 p-0 h-auto">
                    Download error log
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="clay-button bg-white/60 text-slate-700 border-none rounded-2xl px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={processCSV}
            disabled={!file || isProcessing}
            className="clay-button bg-gradient-to-r from-green-200 to-green-300 text-green-800 border-none rounded-2xl px-6 hover:from-green-300 hover:to-green-400"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isProcessing ? "Processing..." : "Run Import"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}