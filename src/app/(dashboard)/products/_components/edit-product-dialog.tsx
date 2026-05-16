'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
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
import { ProductForm } from './product-form';
import { updateProduct } from '@/server/actions/products';
import type { ProductRow } from './products-client';
import type { ProductFormValues } from './product-form';

export function EditProductDialog({
  product,
  onUpdated,
}: {
  product: ProductRow;
  onUpdated: (p: ProductRow) => void;
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: ProductFormValues) {
    const result = await updateProduct(product.id, {
      brand: values.brand,
      name: values.name,
      shadeCode: values.shadeCode || undefined,
      sku: values.sku || undefined,
      category: values.category,
      unit: values.unit,
      notes: values.notes || undefined,
    });

    if (!result.success) {
      return { error: result.error };
    }

    onUpdated({
      ...product,
      brand: values.brand,
      name: values.name,
      shadeCode: values.shadeCode || null,
      sku: values.sku || null,
      category: values.category,
      unit: values.unit,
      notes: values.notes || null,
    });

    toast.success('Product updated');
    setOpen(false);
    return { success: true };
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Edit product"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            {product.brand} — {product.name}
            {product.shadeCode && ` (${product.shadeCode})`}
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          defaultValues={{
            brand: product.brand,
            name: product.name,
            shadeCode: product.shadeCode ?? '',
            sku: product.sku ?? '',
            category: product.category,
            unit: product.unit,
            notes: product.notes ?? '',
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
