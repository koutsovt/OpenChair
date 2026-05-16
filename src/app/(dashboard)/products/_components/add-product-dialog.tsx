'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { createProduct } from '@/server/actions/products';
import type { ProductRow } from './products-client';
import type { ProductFormValues } from './product-form';

export function AddProductDialog({ onCreated }: { onCreated: (p: ProductRow) => void }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: ProductFormValues) {
    const result = await createProduct({
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

    onCreated({
      id: result.productId,
      brand: values.brand,
      name: values.name,
      shadeCode: values.shadeCode || null,
      sku: values.sku || null,
      category: values.category,
      unit: values.unit,
      notes: values.notes || null,
      archivedAt: null,
    });

    toast.success('Product added');
    setOpen(false);
    return { success: true };
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Add a product to your salon catalog. Use the CSV import for bulk additions.
          </DialogDescription>
        </DialogHeader>
        <ProductForm onSubmit={handleSubmit} submitLabel="Add Product" />
      </DialogContent>
    </Dialog>
  );
}
