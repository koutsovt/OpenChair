'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { productCategoryStyle } from '@/lib/product-category-styles';
import { PRODUCT_CATEGORY_VALUES, PRODUCT_UNIT_VALUES } from '@/lib/validations/products';
import type { ProductCategoryValue, ProductUnitValue } from '@/lib/validations/products';

const productFormSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  name: z.string().min(1, 'Name is required'),
  shadeCode: z.string().optional().or(z.literal('')),
  sku: z.string().optional().or(z.literal('')),
  category: z.enum(PRODUCT_CATEGORY_VALUES, { error: 'Category is required' }),
  unit: z.enum(PRODUCT_UNIT_VALUES, { error: 'Unit is required' }),
  notes: z.string().optional().or(z.literal('')),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

const UNIT_LABELS: Record<ProductUnitValue, string> = {
  TUBE: 'Tube',
  BOTTLE: 'Bottle',
  SACHET: 'Sachet',
  EACH: 'Each',
};

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => Promise<{ error?: string; success?: boolean }>;
  submitLabel?: string;
}

export function ProductForm({ defaultValues, onSubmit, submitLabel = 'Save' }: ProductFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      brand: defaultValues?.brand ?? '',
      name: defaultValues?.name ?? '',
      shadeCode: defaultValues?.shadeCode ?? '',
      sku: defaultValues?.sku ?? '',
      category: defaultValues?.category ?? undefined,
      unit: defaultValues?.unit ?? undefined,
      notes: defaultValues?.notes ?? '',
    },
  });

  async function handleSubmit(values: ProductFormValues) {
    const result = await onSubmit(values);
    if (result?.error) {
      form.setError('root', { message: result.error });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Wella Professionals" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Koleston Perfect" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="shadeCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Shade code <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 7/3" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  SKU <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Supplier code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_CATEGORY_VALUES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {productCategoryStyle(c as ProductCategoryValue).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_UNIT_VALUES.map((u) => (
                      <SelectItem key={u} value={u}>
                        {UNIT_LABELS[u as ProductUnitValue]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. Use with Welloxon 30vol, for foil work only"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
