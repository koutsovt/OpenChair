import { Package } from 'lucide-react';
import { getAuthenticatedSalon } from '@/server/auth';
import { prisma } from '@/lib/prisma';
import { BlurText } from '@/components/ui/blur-text';
import { ProductsClient } from './_components/products-client';

export default async function ProductsPage() {
  const salon = await getAuthenticatedSalon();

  const products = await prisma.product.findMany({
    where: { salonId: salon.id },
    orderBy: [{ brand: 'asc' }, { name: 'asc' }, { shadeCode: 'asc' }],
  });

  // Distinct brands for filter dropdown
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();

  const productRows = products.map((p) => ({
    id: p.id,
    brand: p.brand,
    name: p.name,
    shadeCode: p.shadeCode,
    sku: p.sku,
    category: p.category,
    unit: p.unit,
    notes: p.notes,
    archivedAt: p.archivedAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BlurText text="Products" className="text-2xl font-bold tracking-tight" />
          <p className="text-muted-foreground">
            {products.filter((p) => !p.archivedAt).length} active product
            {products.filter((p) => !p.archivedAt).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {productRows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border py-16">
          <Package className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No products yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first product or import from a CSV file.
          </p>
        </div>
      )}

      <ProductsClient initialProducts={productRows} brands={brands} />
    </div>
  );
}
