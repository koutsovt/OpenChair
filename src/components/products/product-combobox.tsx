'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';

type ProductOption = {
  id: string;
  brand: string;
  name: string;
  shadeCode: string | null;
};

type ProductComboboxProps = {
  products: ProductOption[];
  recentProductIds?: string[];
  onSelect: (product: ProductOption) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ProductCombobox({
  products,
  recentProductIds = [],
  onSelect,
  disabled,
  placeholder = 'Search brand, name or shade…',
}: ProductComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();

  const filtered = q
    ? products.filter(
        (p) =>
          p.brand.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.shadeCode ?? '').toLowerCase().includes(q)
      )
    : products;

  // Recent products pinned at top (only when not searching)
  const recents = !q ? products.filter((p) => recentProductIds.includes(p.id)) : [];
  const nonRecents = !q ? filtered.filter((p) => !recentProductIds.includes(p.id)) : filtered;

  const displayList = !q ? [...recents, ...nonRecents] : filtered;
  const showList = open && displayList.length > 0;

  function handleSelect(product: ProductOption) {
    startTransition(() => {
      onSelect(product);
    });
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Popover open={showList} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-9"
            autoComplete="off"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
          {!q && recents.length > 0 && (
            <li className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent
            </li>
          )}
          {displayList.slice(0, 40).map((p, i) => {
            const isRecentBoundary = !q && i === recents.length && recents.length > 0;
            return (
              <li key={p.id}>
                {isRecentBoundary && <div className="mx-2 my-1 border-t" />}
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur before click fires
                    handleSelect(p);
                  }}
                >
                  <span className="font-medium">{p.brand}</span>
                  {' — '}
                  {p.name}
                  {p.shadeCode && (
                    <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {p.shadeCode}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {displayList.length === 0 && q && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              No products match &ldquo;{query}&rdquo;
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
