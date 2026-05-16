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
