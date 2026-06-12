'use client';

import { useState, useMemo } from 'react';
import { Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { productCategoryStyle } from '@/lib/product-category-styles';
import { PRODUCT_CATEGORY_VALUES } from '@/lib/validations/products';
import type { ProductCategoryValue, ProductUnitValue } from '@/lib/validations/products';
import { archiveProduct, restoreProduct } from '@/server/actions/products';
import { AddProductDialog } from './add-product-dialog';
import { EditProductDialog } from './edit-product-dialog';
import { CsvImportDialog } from './csv-import-dialog';

type ProductRow = {
  id: string;
  brand: string;
  name: string;
  shadeCode: string | null;
  sku: string | null;
  category: ProductCategoryValue;
  unit: ProductUnitValue;
  notes: string | null;
  archivedAt: string | null;
};

export function ProductsClient({
  initialProducts,
  brands,
}: {
  initialProducts: ProductRow[];
  brands: string[];
}) {
  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!showArchived && p.archivedAt) return false;
      if (showArchived && !p.archivedAt) return false; // archived view shows ONLY archived
      if (brandFilter !== 'all' && p.brand !== brandFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.brand.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.shadeCode ?? '').toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, brandFilter, categoryFilter, showArchived]);

  function addProduct(p: ProductRow) {
    setProducts((prev) => [...prev, p]);
  }

  function updateProduct(p: ProductRow) {
    setProducts((prev) => prev.map((existing) => (existing.id === p.id ? p : existing)));
  }

  async function handleArchive(id: string) {
    const result = await archiveProduct(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, archivedAt: new Date().toISOString() } : p))
    );
    toast.success('Product archived');
  }

  async function handleRestore(id: string) {
    const result = await restoreProduct(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, archivedAt: null } : p)));
    toast.success('Product restored');
  }

  function onImportComplete(imported: ProductRow[]) {
    setProducts((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      for (const p of imported) byId.set(p.id, p);
      return Array.from(byId.values());
    });
  }

  const unitLabel = (unit: ProductUnitValue) => {
    const map: Record<ProductUnitValue, string> = {
      TUBE: 'Tube',
      BOTTLE: 'Bottle',
      SACHET: 'Sachet',
      EACH: 'Each',
    };
    return map[unit];
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search brand, name, shade…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {PRODUCT_CATEGORY_VALUES.map((c) => (
                <SelectItem key={c} value={c}>
                  {productCategoryStyle(c).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showArchived ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
            className="shrink-0"
          >
            <Archive className="mr-1.5 h-3.5 w-3.5" />
            {showArchived ? 'Showing archived' : 'Show archived'}
          </Button>
        </div>
        <div className="flex gap-2">
          <CsvImportDialog existingProducts={products} onImportComplete={onImportComplete} />
          <AddProductDialog onCreated={addProduct} />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {search || brandFilter !== 'all' || categoryFilter !== 'all'
            ? 'No products match your filters.'
            : showArchived
              ? 'No archived products.'
              : 'No active products.'}
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Shade</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const catStyle = productCategoryStyle(p.category);
                return (
                  <TableRow key={p.id} className={p.archivedAt ? 'opacity-50' : undefined}>
                    <TableCell className="font-medium">{p.brand}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      {p.shadeCode ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {p.shadeCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={catStyle.badge} variant="secondary">
                        {catStyle.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {unitLabel(p.unit)}
                    </TableCell>
                    <TableCell className="hidden max-w-48 md:table-cell">
                      {p.notes ? (
                        <span
                          title={p.notes}
                          className="block truncate text-sm text-muted-foreground"
                        >
                          {p.notes}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!p.archivedAt && (
                          <EditProductDialog product={p} onUpdated={updateProduct} />
                        )}
                        {p.archivedAt ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Restore product"
                            onClick={() => handleRestore(p.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Archive product"
                            onClick={() => handleArchive(p.id)}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {products.filter((p) => !p.archivedAt).length} active product
        {products.filter((p) => !p.archivedAt).length !== 1 ? 's' : ''}
        {products.filter((p) => p.archivedAt).length > 0 &&
          ` · ${products.filter((p) => p.archivedAt).length} archived`}
      </p>
    </div>
  );
}

export type { ProductRow };
