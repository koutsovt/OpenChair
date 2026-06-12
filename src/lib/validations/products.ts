import { z } from 'zod';

// Prisma enum values as plain arrays for Zod v4 z.enum()
export const PRODUCT_CATEGORY_VALUES = [
  'COLOUR',
  'DEVELOPER',
  'SHAMPOO',
  'CONDITIONER',
  'TREATMENT',
  'STYLING',
  'OTHER',
] as const;

export const PRODUCT_UNIT_VALUES = ['TUBE', 'BOTTLE', 'SACHET', 'EACH'] as const;

export type ProductCategoryValue = (typeof PRODUCT_CATEGORY_VALUES)[number];
export type ProductUnitValue = (typeof PRODUCT_UNIT_VALUES)[number];

// ============================================================
// Product CRUD schemas
// ============================================================

export const createProductSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  name: z.string().min(1, 'Name is required'),
  shadeCode: z.string().optional().or(z.literal('')),
  sku: z.string().optional().or(z.literal('')),
  category: z.enum(PRODUCT_CATEGORY_VALUES, {
    error: `Category must be one of: ${PRODUCT_CATEGORY_VALUES.join(', ')}`,
  }),
  unit: z.enum(PRODUCT_UNIT_VALUES, {
    error: `Unit must be one of: ${PRODUCT_UNIT_VALUES.join(', ')}`,
  }),
  notes: z.string().optional().or(z.literal('')),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();

// ============================================================
// CSV import row schema — accepts lowercase, coerces to uppercase
// ============================================================

const categoryLowerValues = PRODUCT_CATEGORY_VALUES.map((v) => v.toLowerCase());
const unitLowerValues = PRODUCT_UNIT_VALUES.map((v) => v.toLowerCase());

export const csvProductRowSchema = z.object({
  brand: z.string().min(1, 'brand is required'),
  name: z.string().min(1, 'name is required'),
  shade_code: z.string().optional().or(z.literal('')),
  sku: z.string().optional().or(z.literal('')),
  category: z
    .string()
    .min(1, 'category is required')
    .transform((v) => v.toUpperCase())
    .refine(
      (v): v is ProductCategoryValue => (PRODUCT_CATEGORY_VALUES as readonly string[]).includes(v),
      {
        message: `category must be one of: ${categoryLowerValues.join(', ')}`,
      }
    ),
  unit: z
    .string()
    .min(1, 'unit is required')
    .transform((v) => v.toUpperCase())
    .refine((v): v is ProductUnitValue => (PRODUCT_UNIT_VALUES as readonly string[]).includes(v), {
      message: `unit must be one of: ${unitLowerValues.join(', ')}`,
    }),
  notes: z.string().optional().or(z.literal('')),
});

/** Natural dedup key per salon — must match the server-side import logic. */
export function productNaturalKey(brand: string, name: string, shadeCode?: string | null): string {
  return `${brand.toLowerCase()}|${name.toLowerCase()}|${shadeCode ?? ''}`;
}

const SHADELESS_CATEGORIES: readonly ProductCategoryValue[] = [
  'SHAMPOO',
  'CONDITIONER',
  'DEVELOPER',
  'STYLING',
  'OTHER',
];

export type CsvRowValidation = {
  /** error = will not import; warning = imports, flagged for attention */
  status: 'valid' | 'warning' | 'error';
  message: string | null;
  /** Row matches a product already in the catalog (brand + name + shade_code). */
  existing: boolean;
};

/**
 * Validate parsed CSV rows for the import preview.
 * `existingKeys` are productNaturalKey() values of products already in the catalog.
 * Row numbers in messages are CSV line numbers (1-indexed + header row).
 */
export function validateCsvRows(
  rows: Array<Record<string, string | undefined>>,
  existingKeys: ReadonlySet<string>
): CsvRowValidation[] {
  const seenInBatch = new Map<string, number>();

  return rows.map((row, i) => {
    const parsed = csvProductRowSchema.safeParse(row);
    if (!parsed.success) {
      return { status: 'error' as const, message: parsed.error.issues[0].message, existing: false };
    }

    const { brand, name, shade_code, category } = parsed.data;
    const key = productNaturalKey(brand, name, shade_code);

    const firstRowNum = seenInBatch.get(key);
    if (firstRowNum !== undefined) {
      return {
        status: 'error' as const,
        message: `duplicate of row ${firstRowNum} (same brand + name + shade_code)`,
        existing: false,
      };
    }
    seenInBatch.set(key, i + 2);

    if (existingKeys.has(key)) {
      return { status: 'warning' as const, message: 'already in catalog', existing: true };
    }

    if (shade_code && SHADELESS_CATEGORIES.includes(category)) {
      return {
        status: 'warning' as const,
        message: `shade code is unusual for category "${category.toLowerCase()}"`,
        existing: false,
      };
    }

    return { status: 'valid' as const, message: null, existing: false };
  });
}

// ============================================================
// Booking product schemas
// ============================================================

export const addBookingProductSchema = z.object({
  bookingId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().optional().or(z.literal('')),
});

export const updateBookingProductSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  notes: z.string().optional().or(z.literal('')),
});

// ============================================================
// Client preferred product schemas
// ============================================================

export const createPreferredProductSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  productId: z.string().nullable().optional(),
  label: z.string().min(1, 'label is required'),
  formula: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  pinned: z.boolean().default(true),
});

export const updatePreferredProductSchema = createPreferredProductSchema
  .omit({ clientId: true })
  .partial();
