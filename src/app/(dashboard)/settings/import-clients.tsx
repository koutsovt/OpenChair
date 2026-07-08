'use client';

import { useRef, useState, useTransition } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { importClients, IMPORT_FIELDS, type ImportField } from '@/server/actions/clients';

const IGNORE = '__ignore__';

const FIELD_LABELS: Record<ImportField, string> = {
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  notes: 'Notes',
  birthDate: 'Birth date',
  source: 'Source',
  allergies: 'Allergies',
  hairType: 'Hair type',
  hairTexture: 'Hair texture',
  naturalColour: 'Natural colour',
  productPreferences: 'Product preferences',
};

// Fuzzy header -> field guesses. Keys are normalized (lowercase, alphanumeric only).
const HEADER_HINTS: Record<string, ImportField> = {
  name: 'name',
  fullname: 'name',
  clientname: 'name',
  customer: 'name',
  firstname: 'name',
  lastname: 'name',
  surname: 'name',
  phone: 'phone',
  mobile: 'phone',
  mobilephone: 'phone',
  cell: 'phone',
  phonenumber: 'phone',
  contact: 'phone',
  email: 'email',
  emailaddress: 'email',
  notes: 'notes',
  note: 'notes',
  comments: 'notes',
  birthday: 'birthDate',
  birthdate: 'birthDate',
  dob: 'birthDate',
  dateofbirth: 'birthDate',
  source: 'source',
  referral: 'source',
  allergies: 'allergies',
  allergy: 'allergies',
  hairtype: 'hairType',
  hairtexture: 'hairTexture',
  naturalcolour: 'naturalColour',
  naturalcolor: 'naturalColour',
  productpreferences: 'productPreferences',
  products: 'productPreferences',
};

function normalize(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function guessField(header: string): ImportField | typeof IGNORE {
  return HEADER_HINTS[normalize(header)] ?? IGNORE;
}

type Mapping = Record<string, ImportField | typeof IGNORE>;

export function ImportClients() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cols = result.meta.fields ?? [];
        if (cols.length === 0) {
          toast.error('Could not read any columns from that file');
          return;
        }
        const initialMapping: Mapping = {};
        for (const col of cols) initialMapping[col] = guessField(col);
        setFileName(file.name);
        setHeaders(cols);
        setRows(result.data);
        setMapping(initialMapping);
      },
      error: (err) => toast.error(`Failed to parse CSV: ${err.message}`),
    });
  };

  const nameMapped = Object.values(mapping).includes('name');

  // Multiple source columns can map to the same field. For `name`, join them in
  // column order (First Name + Last Name -> "Jane Doe"). For every other field,
  // the first non-empty value wins (e.g. Mobile + Phone -> keep the mobile),
  // since concatenating a phone or email would produce garbage.
  const buildRows = () =>
    rows.map((row) => {
      const parts: Partial<Record<ImportField, string[]>> = {};
      for (const [col, field] of Object.entries(mapping)) {
        if (field === IGNORE) continue;
        const value = row[col]?.trim();
        if (!value) continue;
        (parts[field] ??= []).push(value);
      }
      const mapped: Partial<Record<ImportField, string>> = {};
      for (const field of Object.keys(parts) as ImportField[]) {
        const values = parts[field]!;
        mapped[field] = field === 'name' ? values.join(' ') : values[0];
      }
      return mapped;
    });

  const handleImport = () => {
    if (!nameMapped) {
      toast.error('Map a column to Name before importing');
      return;
    }
    startTransition(async () => {
      const result = await importClients(buildRows());
      if (result.imported > 0) {
        toast.success(
          `Imported ${result.imported} client${result.imported === 1 ? '' : 's'}` +
            (result.skipped > 0 ? ` \u00b7 ${result.skipped} skipped` : '')
        );
      } else {
        toast.error(`Nothing imported \u00b7 ${result.skipped} skipped`);
      }
      if (result.errors.length > 0) {
        // Surface the first few issues so the user can fix their file.
        toast.warning(result.errors.slice(0, 3).join('\n'));
      }
      reset();
    });
  };

  const previewRows = rows.slice(0, 5);

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">Import clients</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Upload a CSV exported from your old system (e.g. Kitomba). Map the columns, then import.
      </p>

      {headers.length === 0 ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Choose CSV file
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{fileName}</span> &middot; {rows.length}{' '}
              row{rows.length === 1 ? '' : 's'}
            </p>
            <Button variant="ghost" size="sm" onClick={reset}>
              Choose a different file
            </Button>
          </div>

          {/* Column mapping */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Map columns</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {headers.map((col) => (
                  <div key={col} className="flex items-center gap-2">
                    <Label className="w-1/2 truncate text-sm" title={col}>
                      {col}
                    </Label>
                    <Select
                      value={mapping[col]}
                      onValueChange={(v) =>
                        setMapping((m) => ({ ...m, [col]: v as ImportField | typeof IGNORE }))
                      }
                    >
                      <SelectTrigger className="w-1/2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={IGNORE}>Don&apos;t import</SelectItem>
                        {IMPORT_FIELDS.map((field) => (
                          <SelectItem key={field} value={field}>
                            {FIELD_LABELS[field]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {!nameMapped && (
                <p className="text-sm text-destructive">Map one column to Name to continue.</p>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <div>
            <p className="mb-2 text-sm font-medium">Preview (first {previewRows.length})</p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((col) => (
                      <TableHead key={col}>
                        {mapping[col] === IGNORE ? (
                          <span className="text-muted-foreground line-through">{col}</span>
                        ) : (
                          FIELD_LABELS[mapping[col] as ImportField]
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {headers.map((col) => (
                        <TableCell
                          key={col}
                          className={mapping[col] === IGNORE ? 'text-muted-foreground' : ''}
                        >
                          {row[col]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Button onClick={handleImport} disabled={isPending || !nameMapped}>
            {isPending
              ? 'Importing...'
              : `Import ${rows.length} client${rows.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      )}
    </section>
  );
}
