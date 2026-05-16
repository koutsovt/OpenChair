'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { importProductsCsv } from '@/server/actions/products';
import type { CsvImportRow, CsvImportResult } from '@/server/actions/products';
import type { ProductRow } from './products-client';

type Props = {
  onImportComplete: (imported: ProductRow[]) => void;
};

export function CsvImportDialog({ onImportComplete }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setRows([]);
    setFileName('');
    setResult(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    Papa.parse<CsvImportRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        setRows(results.data);
      },
    });
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const res = await importProductsCsv(rows);
      setResult(res);
      if (res.inserted > 0) {
        toast.success(`Imported ${res.inserted} product${res.inserted !== 1 ? 's' : ''}`);
        onImportComplete([]);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  const preview = rows.slice(0, 10);

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
          {/* File picker */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
              id="csv-file-input"
            />
            <Button variant="outline" size="sm" asChild>
              <label htmlFor="csv-file-input" className="cursor-pointer">
                Choose file
              </label>
            </Button>
            <span className="text-sm text-muted-foreground">{fileName || 'No file chosen'}</span>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
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

          {/* Result summary */}
          {result && (
            <div className="space-y-2 rounded-lg border bg-muted/50 p-3 text-sm">
              <p>
                Imported <strong>{result.inserted}</strong>, skipped{' '}
                <strong>{result.skipped}</strong> duplicate
                {result.skipped !== 1 ? 's' : ''}, <strong>{result.errors.length}</strong> error
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
              <Button onClick={handleImport} disabled={rows.length === 0 || loading}>
                {loading ? 'Importing…' : `Import ${rows.length > 0 ? rows.length : ''} rows`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
