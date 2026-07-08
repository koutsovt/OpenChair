'use client';

import { useState, useTransition, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, Pin, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProductCombobox } from '@/components/products/product-combobox';
import { ProductChip } from '@/components/products/product-chip';
import { format } from 'date-fns';
import {
  addProductToBooking,
  updateBookingProduct,
  removeProductFromBooking,
  applyPreferredProductsToBooking,
  getBookingProducts,
  getPairedDeveloper,
  pinBookingProductToClient,
  repeatLastVisitProducts,
} from '@/server/actions/products';

type BookingProduct = {
  id: string;
  productId: string;
  product: { brand: string; name: string; shadeCode: string | null };
  quantity: number;
  notes: string | null;
};

type ProductOption = { id: string; brand: string; name: string; shadeCode: string | null };

interface ProductsUsedSectionProps {
  bookingId: string;
  clientId: string;
  initialBookingProducts: BookingProduct[];
  hasPreferred: boolean;
  hasLastVisit: boolean;
  lastVisitDate: Date | null;
  lastVisitItems: { label: string; quantity: number }[];
  allProducts: (ProductOption & { category: string })[];
  recentProductIds: string[];
}

type PinForm = { label: string; formula: string; notes: string };
const emptyPin = (): PinForm => ({ label: '', formula: '', notes: '' });

export function ProductsUsedSection({
  bookingId,
  clientId,
  initialBookingProducts,
  hasPreferred,
  hasLastVisit,
  lastVisitDate,
  lastVisitItems,
  allProducts,
  recentProductIds,
}: ProductsUsedSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState<BookingProduct[]>(initialBookingProducts);
  const [isPending, startTransition] = useTransition();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [pinForm, setPinForm] = useState<PinForm>(emptyPin());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [devSuggestion, setDevSuggestion] = useState<ProductOption | null>(null);

  const categoryById = useMemo(
    () => new Map(allProducts.map((p) => [p.id, p.category])),
    [allProducts]
  );

  // router.refresh() alone cannot update `items` (useState keeps its value when
  // server props change), so bulk additions re-fetch the list explicitly.
  const refetchItems = async () => {
    const res = await getBookingProducts(bookingId);
    if (res.success) {
      setItems(
        res.products.map((bp) => ({
          id: bp.id,
          productId: bp.productId,
          product: {
            brand: bp.product.brand,
            name: bp.product.name,
            shadeCode: bp.product.shadeCode,
          },
          quantity: bp.quantity,
          notes: bp.notes,
        }))
      );
    }
  };

  const handleApplyPreferred = () => {
    if (items.length > 0) {
      if (!confirm('This will add preferred products to the existing list. Continue?')) return;
    }
    startTransition(async () => {
      const res = await applyPreferredProductsToBooking({ bookingId, clientId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (res.addedCount === 0) {
        toast.info('No new preferred products to add');
        return;
      }
      await refetchItems();
    });
  };

  const handleRepeatLastVisit = () => {
    startTransition(async () => {
      const res = await repeatLastVisitProducts({ bookingId, clientId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (res.addedCount === 0) {
        toast.info('No new products to add from the last visit');
        return;
      }
      await refetchItems();
    });
  };

  // After adding a colour with no developer on the list, suggest the developer
  // this salon most often pairs with it — one tap instead of a second search.
  const maybeSuggestDeveloper = (added: ProductOption, currentItems: BookingProduct[]) => {
    if (categoryById.get(added.id) !== 'COLOUR') return;
    const hasDeveloper = currentItems.some((i) => categoryById.get(i.productId) === 'DEVELOPER');
    if (hasDeveloper) return;
    getPairedDeveloper(added.id)
      .then((res) => {
        if (res.success && res.developer) {
          setDevSuggestion(res.developer);
        }
      })
      .catch(() => {
        // Suggestion is best-effort; adding the colour already succeeded.
      });
  };

  const handleSelect = (product: ProductOption) => {
    startTransition(async () => {
      const res = await addProductToBooking({ bookingId, productId: product.id, quantity: 1 });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const next: BookingProduct[] = [
        ...items,
        {
          id: res.bookingProductId,
          productId: product.id,
          product: { brand: product.brand, name: product.name, shadeCode: product.shadeCode },
          quantity: 1,
          notes: null,
        },
      ];
      setItems(next);
      setDevSuggestion((prev) => (prev?.id === product.id ? null : prev));
      maybeSuggestDeveloper(product, next);
    });
  };

  const handleQtyChange = (id: string, delta: number) => {
    const updated = items.find((i) => i.id === id);
    if (!updated) return;
    const newQty = Math.max(1, updated.quantity + delta);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item)));
    startTransition(async () => {
      await updateBookingProduct(id, { quantity: newQty });
    });
  };

  const handleNotesChange = (id: string, value: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, notes: value } : item)));
    clearTimeout(debounceTimers.current[id]);
    debounceTimers.current[id] = setTimeout(() => {
      void updateBookingProduct(id, { notes: value });
    }, 500);
  };

  const handleRemove = (id: string) => {
    const previous = items;
    setItems((prev) => prev.filter((item) => item.id !== id));
    startTransition(async () => {
      const res = await removeProductFromBooking(id);
      if (!res.success) {
        toast.error(res.error);
        setItems(previous);
      }
    });
  };

  const togglePin = (id: string) => {
    if (pinningId === id) {
      setPinningId(null);
      return;
    }
    setPinningId(id);
    setPinForm(emptyPin());
  };

  const handleSavePin = (bookingProductId: string) => {
    if (!pinForm.label.trim()) return;
    startTransition(async () => {
      const res = await pinBookingProductToClient({
        bookingProductId,
        clientId,
        label: pinForm.label.trim(),
        formula: pinForm.formula || undefined,
        notes: pinForm.notes || undefined,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setPinnedIds((prev) => new Set(prev).add(bookingProductId));
      setPinningId(null);
      // refresh so the hasPreferred prop reflects the new pinned entry
      router.refresh();
    });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Products used</h2>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPreferred || isPending}
          onClick={handleApplyPreferred}
        >
          Apply preferred
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasLastVisit || isPending}
          onClick={handleRepeatLastVisit}
        >
          ↩ Repeat last visit{lastVisitDate ? ` (${format(lastVisitDate, 'd MMM')})` : ''}
        </Button>
      </div>

      {hasLastVisit && lastVisitItems.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Last visit:{' '}
          {lastVisitItems
            .map((i) => (i.quantity > 1 ? `${i.label} ×${i.quantity}` : i.label))
            .join(' · ')}
        </p>
      )}

      <ProductCombobox
        products={allProducts}
        recentProductIds={recentProductIds}
        onSelect={handleSelect}
        disabled={isPending}
      />

      {devSuggestion && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2 text-sm">
          <span>
            Usually paired with{' '}
            <span className="font-medium">
              {devSuggestion.brand} {devSuggestion.name}
              {devSuggestion.shadeCode ? ` ${devSuggestion.shadeCode}` : ''}
            </span>
          </span>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => {
              const suggestion = devSuggestion;
              setDevSuggestion(null);
              handleSelect(suggestion);
            }}
          >
            Add
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDevSuggestion(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((bp) => (
            <li key={bp.id} className="rounded-md border">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <ProductChip
                    brand={bp.product.brand}
                    name={bp.product.name}
                    shadeCode={bp.product.shadeCode}
                  />
                </div>
                {/* Quantity stepper */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleQtyChange(bp.id, -1)}
                    disabled={bp.quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm tabular-nums">{bp.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleQtyChange(bp.id, 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {/* Notes (debounced 500ms) */}
                <Input
                  className="h-7 w-40 text-sm"
                  placeholder="Notes…"
                  value={bp.notes ?? ''}
                  onChange={(e) => handleNotesChange(bp.id, e.target.value)}
                />
                {/* Pin to preferred */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${pinnedIds.has(bp.id) ? 'text-green-600' : ''}`}
                  onClick={() => togglePin(bp.id)}
                  disabled={isPending}
                  aria-label="Pin to preferred"
                >
                  {pinnedIds.has(bp.id) ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Pin className="h-3.5 w-3.5" />
                  )}
                </Button>
                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => handleRemove(bp.id)}
                  aria-label="Remove product"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {pinningId === bp.id && (
                <div className="space-y-2 border-t p-3">
                  <Input
                    placeholder="Label (required)"
                    value={pinForm.label}
                    onChange={(e) => setPinForm((f) => ({ ...f, label: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Formula (optional)"
                    value={pinForm.formula}
                    onChange={(e) => setPinForm((f) => ({ ...f, formula: e.target.value }))}
                    rows={2}
                    className="font-mono text-sm"
                  />
                  <Textarea
                    placeholder="Notes (optional)"
                    value={pinForm.notes}
                    onChange={(e) => setPinForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSavePin(bp.id)}
                      disabled={isPending || !pinForm.label.trim()}
                    >
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPinningId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
