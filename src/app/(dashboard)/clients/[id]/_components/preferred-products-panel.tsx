'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pin, PinOff, Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductChip } from '@/components/products/product-chip';
import { ProductCombobox } from '@/components/products/product-combobox';
import {
  createPreferredProduct,
  updatePreferredProduct,
  deletePreferredProduct,
} from '@/server/actions/products';

type ProductOption = { id: string; brand: string; name: string; shadeCode: string | null };
type PreferredEntry = {
  id: string;
  productId: string | null;
  label: string;
  formula: string | null;
  notes: string | null;
  pinned: boolean;
  product?: { brand: string; name: string; shadeCode: string | null };
};
type FormState = {
  label: string;
  productId: string | null;
  selectedProduct: ProductOption | null;
  formula: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  label: '',
  productId: null,
  selectedProduct: null,
  formula: '',
  notes: '',
});

interface Props {
  clientId: string;
  initialPreferred: PreferredEntry[];
  allProducts: ProductOption[];
}

export function PreferredProductsPanel({ clientId, initialPreferred, allProducts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const pinned = initialPreferred.filter((p) => p.pinned);
  const unpinned = initialPreferred.filter((p) => !p.pinned);

  function openEdit(entry: PreferredEntry) {
    setShowAdd(false);
    setEditingId(entry.id);
    setForm({
      label: entry.label,
      productId: entry.productId,
      formula: entry.formula ?? '',
      notes: entry.notes ?? '',
      selectedProduct: entry.product ? { id: entry.productId!, ...entry.product } : null,
    });
  }

  const handleProductSelect = (p: ProductOption) =>
    setForm((f) => ({ ...f, productId: p.id, selectedProduct: p }));

  function handleSaveAdd() {
    if (!form.label.trim()) return;
    startTransition(async () => {
      await createPreferredProduct({
        clientId,
        productId: form.productId ?? undefined,
        label: form.label.trim(),
        formula: form.formula || undefined,
        notes: form.notes || undefined,
        pinned: true,
      });
      setShowAdd(false);
      setForm(emptyForm());
      router.refresh();
    });
  }

  function handleSaveEdit() {
    if (!editingId || !form.label.trim()) return;
    startTransition(async () => {
      await updatePreferredProduct(editingId, {
        productId: form.productId ?? undefined,
        label: form.label.trim(),
        formula: form.formula || undefined,
        notes: form.notes || undefined,
      });
      setEditingId(null);
      router.refresh();
    });
  }

  function handlePinToggle(entry: PreferredEntry) {
    startTransition(async () => {
      await updatePreferredProduct(entry.id, { pinned: !entry.pinned });
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this preferred product?')) return;
    startTransition(async () => {
      await deletePreferredProduct(id);
      router.refresh();
    });
  }

  const formEl = (onSave: () => void, onCancel: () => void) => (
    <div className="space-y-3 rounded-md border p-3">
      <Input
        placeholder="Label (required)"
        value={form.label}
        onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
      />
      <ProductCombobox
        products={allProducts}
        onSelect={handleProductSelect}
        placeholder="Link a product (optional)…"
        disabled={isPending}
      />
      {form.selectedProduct && (
        <div className="flex items-center gap-2">
          <ProductChip
            brand={form.selectedProduct.brand}
            name={form.selectedProduct.name}
            shadeCode={form.selectedProduct.shadeCode}
          />
          <button
            type="button"
            aria-label="Clear"
            onClick={() => setForm((f) => ({ ...f, productId: null, selectedProduct: null }))}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
      <Textarea
        placeholder="Formula (optional)"
        value={form.formula}
        onChange={(e) => setForm((f) => ({ ...f, formula: e.target.value }))}
        rows={2}
        className="font-mono text-sm"
      />
      <Textarea
        placeholder="Notes (optional)"
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        rows={2}
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={isPending || !form.label.trim()}>
          <Check className="mr-1 h-3.5 w-3.5" />
          Save
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );

  const rowEl = (entry: PreferredEntry) => (
    <li key={entry.id} className="flex flex-wrap items-start gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold">{entry.label}</p>
        {entry.product ? (
          <ProductChip
            brand={entry.product.brand}
            name={entry.product.name}
            shadeCode={entry.product.shadeCode}
          />
        ) : (
          <span className="text-xs text-muted-foreground">(no product)</span>
        )}
        {entry.formula && (
          <p className="font-mono text-xs text-muted-foreground">{entry.formula}</p>
        )}
        {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => openEdit(entry)}
          disabled={isPending}
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handlePinToggle(entry)}
          disabled={isPending}
          aria-label={entry.pinned ? 'Unpin' : 'Pin'}
        >
          {entry.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => handleDelete(entry.id)}
          disabled={isPending}
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Preferred products &amp; formulas</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowAdd(true);
            setEditingId(null);
            setForm(emptyForm());
          }}
          disabled={showAdd}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add preferred product
        </Button>
      </div>

      {showAdd && formEl(handleSaveAdd, () => setShowAdd(false))}

      {pinned.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">No pinned preferred products yet.</p>
      )}

      <ul className="space-y-2">
        {pinned.map((entry) =>
          editingId === entry.id ? (
            <li key={entry.id} className="rounded-md border p-3">
              {formEl(handleSaveEdit, () => setEditingId(null))}
            </li>
          ) : (
            rowEl(entry)
          )
        )}
      </ul>

      {unpinned.length > 0 && (
        <details>
          <summary className="cursor-pointer select-none text-sm text-muted-foreground hover:text-foreground">
            Archive ({unpinned.length} unpinned)
          </summary>
          <ul className="mt-2 space-y-2">
            {unpinned.map((entry) =>
              editingId === entry.id ? (
                <li key={entry.id} className="rounded-md border p-3">
                  {formEl(handleSaveEdit, () => setEditingId(null))}
                </li>
              ) : (
                rowEl(entry)
              )
            )}
          </ul>
        </details>
      )}
    </div>
  );
}
