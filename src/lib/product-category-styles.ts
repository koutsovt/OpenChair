import type { ProductCategoryValue } from '@/lib/validations/products';

export type ProductCategoryStyle = {
  badge: string;
  label: string;
};

const CATEGORY_STYLES: Record<ProductCategoryValue, ProductCategoryStyle> = {
  COLOUR: {
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    label: 'Colour',
  },
  DEVELOPER: {
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    label: 'Developer',
  },
  SHAMPOO: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    label: 'Shampoo',
  },
  CONDITIONER: {
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    label: 'Conditioner',
  },
  TREATMENT: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    label: 'Treatment',
  },
  STYLING: {
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'Styling',
  },
  OTHER: {
    badge: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    label: 'Other',
  },
};

export function productCategoryStyle(category: ProductCategoryValue): ProductCategoryStyle {
  return CATEGORY_STYLES[category];
}
