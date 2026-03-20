'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  FileImage,
  X,
  Loader2,
  Receipt,
  DollarSign,
  Calendar,
  Store,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUploadReceiptMutation } from '@/store/api/uploadApi';

interface ReceiptLineItem {
  name: string;
  amount: number;
}

interface ParsedReceipt {
  merchant: string;
  date: string | null;
  total: number;
  currency: string;
  items: ReceiptLineItem[];
  category: string | null;
}

export default function ReceiptScannerClient() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedReceipt | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadReceipt, { isLoading, error }] = useUploadReceiptMutation();

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleScan = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadReceipt(formData).unwrap();
      setResult(res.receipt);
    } catch {
      // error state handled by RTK Query
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Receipt Scanner</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a receipt photo and AI will extract the merchant, items, and total automatically.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5" />
              Upload Receipt
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <div
                className={`relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mb-4 rounded-full bg-primary/10 p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium">Drop a receipt image here</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click to browse (JPEG, PNG, WebP)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-xl border">
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="max-h-[400px] w-full object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8"
                    onClick={handleClear}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <FileImage className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">{file?.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {file ? `${(file.size / 1024).toFixed(0)} KB` : ''}
                  </span>
                </div>

                <Button onClick={handleScan} disabled={isLoading} className="w-full" size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning with AI...
                    </>
                  ) : (
                    <>
                      <Receipt className="mr-2 h-4 w-4" />
                      Scan Receipt
                    </>
                  )}
                </Button>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                Failed to scan receipt. Please try again with a clearer image.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5" />
              Extracted Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !isLoading && (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Receipt className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload and scan a receipt to see extracted data here.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex min-h-[300px] flex-col items-center justify-center">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Analyzing receipt...</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  AI is extracting merchant, items, and total
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm font-medium">Receipt scanned successfully</p>
                </div>

                {/* Merchant & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Store className="h-3.5 w-3.5" />
                      Merchant
                    </div>
                    <p className="text-sm font-semibold">{result.merchant}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Date
                    </div>
                    <p className="text-sm font-semibold">{result.date ?? 'Not detected'}</p>
                  </div>
                </div>

                {/* Total & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      Total
                    </div>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(result.total, result.currency)}
                    </p>
                  </div>
                  {result.category && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Tag className="h-3.5 w-3.5" />
                        Category
                      </div>
                      <Badge variant="secondary" className="mt-0.5">
                        {result.category}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                {result.items.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Line Items ({result.items.length})
                      </p>
                      <div className="space-y-2">
                        {result.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                          >
                            <span>{item.name}</span>
                            <span className="font-medium">
                              {formatCurrency(item.amount, result.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <Button className="w-full" variant="outline">
                  Create Expense from Receipt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
