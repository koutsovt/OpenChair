'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Upload, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { productNaturalKey, validateCsvRows } from '@/lib/validations/products';
import type { CsvRowValidation } from '@/lib/validations/products';
import { importProductsCsv } from '@/server/actions/products';
import type { CsvImportRow, CsvImportResult } from '@/server/actions/products';
import type { ProductRow } from './products-client';

const TEMPLATE_CSV = `brand,name,shade_code,sku,category,unit,notes
Wella Professionals,Koleston Perfect Pure Naturals,7/0,,colour,tube,
Wella Professionals,Welloxon Perfect 30vol,,WO30,developer,bottle,Use 1:1 with Koleston
Schwarzkopf Professional,IGORA Royal,8-77,,colour,tube,Copper blonde
Kevin Murphy,HYDRATE-ME.WASH,,,shampoo,bottle,Dry/colour-treated hair
`;

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function StatusIcon({ validation }: { validation: CsvRowValidation }) {
  if (validation.status === 'error') {
    return <XCircle className="h-4 w-4 text-destructive" aria-label="Error" />;
  }
  if (validation.status === 'warning') {
    return <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Warning" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Valid" />;
}

type Props = {
  existingProducts: Array<{ brand: string; name: string; shadeCode: string | null }>;
  onImportComplete: (imported: ProductRow[]) => void;
};

export function CsvImportDialog({ existingProducts, onImportComplete }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [validations, setValidations] = useState<CsvRowValidation[]>([]);
  const [fileName, setFileName] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const existingKeys = useMemo(
    () => new Set(existingProducts.map((p) => productNaturalKey(p.brand, p.name, p.shadeCode))),
    [existingProducts]
  );

  const validCount = validations.filter((v) => v.status !== 'error').length;
  const errorCount = validations.length - validCount;
  const existingCount = validations.filter((v) => v.existing).length;

  function reset() {
    setRows([]);
    setValidations([]);
    setFileName('');
    setUpdateExisting(false);
    setResult(null);
    setLoading(false);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  function parseFile(file: File) {
    setFileName(file.name);
    setResult(null);
    Papa.parse<CsvImportRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        setRows(results.data);
        setValidations(validateCsvRows(results.data, existingKeys));
      },
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  async function handleImport() {
    const importable = rows.filter((_, i) => validations[i]?.status !== 'error');
    if (importable.length === 0) return;
    setLoading(true);
    try {
      const res = await importProductsCsv(importable, { updateExisting });
      setResult(res);
      if (res.products.length > 0) {
        toast.success(
          `Imported ${res.inserted} product${res.inserted !== 1 ? 's' : ''}` +
            (res.updated > 0 ? `, updated ${res.updated}` : '')
        );
        onImportComplete(res.products);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  const preview = rows.slice(0, 10);
  const flagged = validations
    .map((v, i) => ({ ...v, rowNum: i + 2 }))
    .filter((v) => v.status !== 'valid');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: brand, name, shade_code, sku, category, unit, notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone + file picker */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
              id="csv-file-input"
            />
            <p className="text-sm text-muted-foreground">
              Drag a .csv file here, or{' '}
              <label
                htmlFor="csv-file-input"
                className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
              >
                choose a file
              </label>
            </p>
            <span className="text-xs text-muted-foreground">{fileName || 'No file chosen'}</span>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" />
              Download template
            </Button>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Brand</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Shade</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {validations[i] && <StatusIcon validation={validations[i]} />}
                      </TableCell>
                      <TableCell>{row.brand}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.shade_code ?? '—'}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 10 && (
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                  Showing first 10 of {rows.length} rows
                </p>
              )}
            </div>
          )}

          {/* Validation summary */}
          {rows.length > 0 && !result && (
            <div className="space-y-2 text-sm">
              <p>
                <strong>{validCount}</strong> valid · <strong>{errorCount}</strong> invalid (will be
                skipped)
                {existingCount > 0 && (
                  <>
                    {' '}
                    · <strong>{existingCount}</strong> already in catalog (will be{' '}
                    {updateExisting ? 'updated' : 'skipped'})
                  </>
                )}
              </p>
              {flagged.length > 0 && (
                <ul className="max-h-28 space-y-0.5 overflow-y-auto pl-1 text-xs">
                  {flagged.map((v) => (
                    <li
                      key={v.rowNum}
                      className={v.status === 'error' ? 'text-destructive' : 'text-amber-600'}
                    >
                      Row {v.rowNum}: {v.message}
                    </li>
                  ))}
                </ul>
              )}
              {existingCount > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="update-existing"
                    checked={updateExisting}
                    onCheckedChange={(checked) => setUpdateExisting(checked === true)}
                  />
                  <Label htmlFor="update-existing" className="text-sm font-normal">
                    Update existing products on match (sku, category, unit, notes)
                  </Label>
                </div>
              )}
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className="space-y-2 rounded-lg border bg-muted/50 p-3 text-sm">
              <p>
                Imported <strong>{result.inserted}</strong>, updated{' '}
                <strong>{result.updated}</strong>, skipped <strong>{result.skipped}</strong>,{' '}
                <strong>{result.errors.length}</strong> error
                {result.errors.length !== 1 ? 's' : ''}.
              </p>
              {result.errors.length > 0 && (
                <ul className="list-disc space-y-0.5 pl-5 text-destructive">
                  {result.errors.slice(0, 5).map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                  {result.errors.length > 5 && (
                    <li className="text-muted-foreground">…and {result.errors.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button onClick={handleImport} disabled={validCount === 0 || loading}>
                {loading ? 'Importing…' : `Import ${validCount} row${validCount !== 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
