'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedSalon } from '@/server/auth';
import {
  createProductSchema,
  updateProductSchema,
  csvProductRowSchema,
  addBookingProductSchema,
  updateBookingProductSchema,
  createPreferredProductSchema,
  updatePreferredProductSchema,
  productNaturalKey,
  type ProductCategoryValue,
  type ProductUnitValue,
} from '@/lib/validations/products';

// ============================================================
// PRODUCTS CRUD
// ============================================================

export async function getProducts(filters?: {
  search?: string;
  brand?: string;
  category?: ProductCategoryValue;
  includeArchived?: boolean;
}) {
  const salon = await getAuthenticatedSalon();

  const where = {
    salonId: salon.id,
    archivedAt: filters?.includeArchived ? undefined : null,
    ...(filters?.brand ? { brand: filters.brand } : {}),
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.search
      ? {
          OR: [
            { brand: { contains: filters.search, mode: 'insensitive' as const } },
            { name: { contains: filters.search, mode: 'insensitive' as const } },
            { shadeCode: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  return prisma.product.findMany({
    where,
    orderBy: [{ brand: 'asc' }, { name: 'asc' }, { shadeCode: 'asc' }],
  });
}

export async function getProductById(id: string) {
  const salon = await getAuthenticatedSalon();

  const product = await prisma.product.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!product) return { success: false as const, error: 'Product not found' };
  return { success: true as const, product };
}

export async function createProduct(
  data: Parameters<typeof createProductSchema.parse>[0]
): Promise<{ success: true; productId: string } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const parsed = createProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { brand, name, shadeCode, sku, category, unit, notes } = parsed.data;

  // Dedup check: brand + name + shadeCode is the natural key per salon
  const existing = await prisma.product.findFirst({
    where: {
      salonId: salon.id,
      brand,
      name,
      shadeCode: shadeCode || null,
    },
    select: { id: true, archivedAt: true },
  });

  if (existing) {
    if (existing.archivedAt) {
      return {
        success: false,
        error: 'A product with this brand/name/shade exists but is archived. Restore it instead.',
      };
    }
    return { success: false, error: 'A product with this brand, name and shade already exists.' };
  }

  const product = await prisma.product.create({
    data: {
      brand,
      name,
      shadeCode: shadeCode || null,
      sku: sku || null,
      category,
      unit,
      notes: notes || null,
      salonId: salon.id,
    },
  });

  revalidatePath('/products');
  return { success: true, productId: product.id };
}

export async function updateProduct(
  id: string,
  data: Parameters<typeof updateProductSchema.parse>[0]
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const existing = await prisma.product.findFirst({
    where: { id, salonId: salon.id },
  });
  if (!existing) return { success: false, error: 'Product not found' };

  const parsed = updateProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { brand, name, shadeCode, sku, category, unit, notes } = parsed.data;

  await prisma.product.update({
    where: { id },
    data: {
      ...(brand !== undefined && { brand }),
      ...(name !== undefined && { name }),
      ...(shadeCode !== undefined && { shadeCode: shadeCode || null }),
      ...(sku !== undefined && { sku: sku || null }),
      ...(category !== undefined && { category }),
      ...(unit !== undefined && { unit }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  revalidatePath('/products');
  return { success: true };
}

export async function archiveProduct(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const product = await prisma.product.findFirst({
    where: { id, salonId: salon.id },
  });
  if (!product) return { success: false, error: 'Product not found' };
  if (product.archivedAt) return { success: false, error: 'Product is already archived' };

  await prisma.product.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  revalidatePath('/products');
  return { success: true };
}

export async function restoreProduct(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const product = await prisma.product.findFirst({
    where: { id, salonId: salon.id },
  });
  if (!product) return { success: false, error: 'Product not found' };

  await prisma.product.update({
    where: { id },
    data: { archivedAt: null },
  });

  revalidatePath('/products');
  return { success: true };
}

// ============================================================
// CSV BULK IMPORT
// ============================================================

export type CsvImportRow = {
  brand: string;
  name: string;
  shade_code?: string;
  sku?: string;
  category: string;
  unit: string;
  notes?: string;
};

export type ImportedProduct = {
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

export type CsvImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  /** Inserted + updated rows, serialized for client-side table merge. */
  products: ImportedProduct[];
};

type ParsedCsvRow = {
  brand: string;
  name: string;
  shadeCode: string | null;
  sku: string | null;
  category: ProductCategoryValue;
  unit: ProductUnitValue;
  notes: string | null;
};

function serializeProduct(p: {
  id: string;
  brand: string;
  name: string;
  shadeCode: string | null;
  sku: string | null;
  category: ProductCategoryValue;
  unit: ProductUnitValue;
  notes: string | null;
  archivedAt: Date | null;
}): ImportedProduct {
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    shadeCode: p.shadeCode,
    sku: p.sku,
    category: p.category,
    unit: p.unit,
    notes: p.notes,
    archivedAt: p.archivedAt?.toISOString() ?? null,
  };
}

export async function importProductsCsv(
  rows: CsvImportRow[],
  options?: { updateExisting?: boolean }
): Promise<CsvImportResult> {
  const salon = await getAuthenticatedSalon();
  const updateExisting = options?.updateExisting ?? false;

  const errors: CsvImportResult['errors'] = [];
  const validRows: ParsedCsvRow[] = [];

  // Validate all rows first
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-indexed + header row
    const parsed = csvProductRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push({ row: rowNum, message: parsed.error.issues[0].message });
      continue;
    }
    const { brand, name, shade_code, sku, category, unit, notes } = parsed.data;

    // Dedup within the batch itself
    const key = productNaturalKey(brand, name, shade_code);
    const batchDup = validRows.some((r) => productNaturalKey(r.brand, r.name, r.shadeCode) === key);
    if (batchDup) {
      errors.push({
        row: rowNum,
        message: `duplicate within upload (same brand + name + shade_code)`,
      });
      continue;
    }

    validRows.push({
      brand,
      name,
      shadeCode: shade_code || null,
      sku: sku || null,
      category,
      unit,
      notes: notes || null,
    });
  }

  if (validRows.length === 0) {
    return { inserted: 0, updated: 0, skipped: rows.length, errors, products: [] };
  }

  // Check against existing products in DB in one query
  const existingProducts = await prisma.product.findMany({
    where: { salonId: salon.id },
    select: { id: true, brand: true, name: true, shadeCode: true },
  });

  const existingByKey = new Map(
    existingProducts.map((p) => [productNaturalKey(p.brand, p.name, p.shadeCode), p.id])
  );

  const toInsert: Array<ParsedCsvRow & { salonId: string }> = [];
  const toUpdate: Array<{ id: string; row: ParsedCsvRow }> = [];

  for (const row of validRows) {
    const existingId = existingByKey.get(productNaturalKey(row.brand, row.name, row.shadeCode));
    if (existingId) {
      toUpdate.push({ id: existingId, row });
      continue;
    }
    toInsert.push({ ...row, salonId: salon.id });
  }

  const inserted =
    toInsert.length > 0
      ? await prisma.product.createManyAndReturn({ data: toInsert, skipDuplicates: true })
      : [];

  // Existing matches: update mutable fields when requested, otherwise skip
  const updated =
    updateExisting && toUpdate.length > 0
      ? await prisma.$transaction(
          toUpdate.map(({ id, row }) =>
            prisma.product.update({
              where: { id },
              data: { sku: row.sku, category: row.category, unit: row.unit, notes: row.notes },
            })
          )
        )
      : [];

  const invalidCount = rows.length - validRows.length;
  const skipped = invalidCount + (updateExisting ? 0 : toUpdate.length);

  revalidatePath('/products');
  return {
    inserted: inserted.length,
    updated: updated.length,
    skipped,
    errors,
    products: [...inserted, ...updated].map(serializeProduct),
  };
}

// ============================================================
// BOOKING PRODUCTS
// ============================================================

export async function getBookingProducts(bookingId: string) {
  const salon = await getAuthenticatedSalon();

  // Verify booking belongs to this salon
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, salonId: salon.id },
    select: { id: true },
  });
  if (!booking) return { success: false as const, error: 'Booking not found' };

  const products = await prisma.bookingProduct.findMany({
    where: { bookingId },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });

  return { success: true as const, products };
}

export async function addProductToBooking(
  data: Parameters<typeof addBookingProductSchema.parse>[0]
): Promise<{ success: true; bookingProductId: string } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const parsed = addBookingProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { bookingId, productId, quantity, notes } = parsed.data;

  // Scope checks
  const [booking, product] = await Promise.all([
    prisma.booking.findFirst({ where: { id: bookingId, salonId: salon.id }, select: { id: true } }),
    prisma.product.findFirst({ where: { id: productId, salonId: salon.id }, select: { id: true } }),
  ]);

  if (!booking) return { success: false, error: 'Booking not found' };
  if (!product) return { success: false, error: 'Product not found' };

  const bp = await prisma.bookingProduct.create({
    data: {
      bookingId,
      productId,
      quantity,
      notes: notes || null,
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
  return { success: true, bookingProductId: bp.id };
}

export async function updateBookingProduct(
  id: string,
  data: Parameters<typeof updateBookingProductSchema.parse>[0]
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const parsed = updateBookingProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Verify ownership through the booking's salonId
  const bp = await prisma.bookingProduct.findFirst({
    where: { id },
    include: { booking: { select: { id: true, salonId: true } } },
  });

  if (!bp || bp.booking.salonId !== salon.id) {
    return { success: false, error: 'Booking product not found' };
  }

  await prisma.bookingProduct.update({
    where: { id },
    data: {
      ...(parsed.data.quantity !== undefined && { quantity: parsed.data.quantity }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes || null }),
    },
  });

  revalidatePath(`/bookings/${bp.booking.id}`);
  return { success: true };
}

export async function removeProductFromBooking(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const bp = await prisma.bookingProduct.findFirst({
    where: { id },
    include: { booking: { select: { id: true, salonId: true } } },
  });

  if (!bp || bp.booking.salonId !== salon.id) {
    return { success: false, error: 'Booking product not found' };
  }

  await prisma.bookingProduct.delete({ where: { id } });

  revalidatePath(`/bookings/${bp.booking.id}`);
  return { success: true };
}

// ============================================================
// CLIENT PREFERRED PRODUCTS
// ============================================================

export async function getClientPreferredProducts(clientId: string) {
  const salon = await getAuthenticatedSalon();

  const client = await prisma.client.findFirst({
    where: { id: clientId, salonId: salon.id },
    select: { id: true },
  });
  if (!client) return { success: false as const, error: 'Client not found' };

  const items = await prisma.clientPreferredProduct.findMany({
    where: { clientId },
    include: { product: true },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'asc' }],
  });

  return { success: true as const, items };
}

export async function createPreferredProduct(
  data: Parameters<typeof createPreferredProductSchema.parse>[0]
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const parsed = createPreferredProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { clientId, productId, label, formula, notes, pinned } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, salonId: salon.id },
    select: { id: true },
  });
  if (!client) return { success: false, error: 'Client not found' };

  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, salonId: salon.id },
      select: { id: true },
    });
    if (!product) return { success: false, error: 'Product not found' };
  }

  const item = await prisma.clientPreferredProduct.create({
    data: {
      clientId,
      productId: productId ?? null,
      label,
      formula: formula || null,
      notes: notes || null,
      pinned,
      salonId: salon.id,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true, id: item.id };
}

export async function updatePreferredProduct(
  id: string,
  data: Parameters<typeof updatePreferredProductSchema.parse>[0]
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const parsed = updatePreferredProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const item = await prisma.clientPreferredProduct.findFirst({
    where: { id, salonId: salon.id },
    select: { id: true, clientId: true },
  });
  if (!item) return { success: false, error: 'Preferred product not found' };

  const { productId, label, formula, notes, pinned } = parsed.data;

  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, salonId: salon.id },
      select: { id: true },
    });
    if (!product) return { success: false, error: 'Product not found' };
  }

  await prisma.clientPreferredProduct.update({
    where: { id },
    data: {
      ...(productId !== undefined && { productId: productId ?? null }),
      ...(label !== undefined && { label }),
      ...(formula !== undefined && { formula: formula || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(pinned !== undefined && { pinned }),
    },
  });

  revalidatePath(`/clients/${item.clientId}`);
  return { success: true };
}

export async function deletePreferredProduct(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const item = await prisma.clientPreferredProduct.findFirst({
    where: { id, salonId: salon.id },
    select: { id: true, clientId: true },
  });
  if (!item) return { success: false, error: 'Preferred product not found' };

  await prisma.clientPreferredProduct.delete({ where: { id } });

  revalidatePath(`/clients/${item.clientId}`);
  return { success: true };
}

/**
 * Bulk-apply a client's pinned preferred products to a booking.
 * Only entries with a non-null productId are applied (freetext-only entries are skipped).
 */
export async function applyPreferredProductsToBooking(data: {
  bookingId: string;
  clientId: string;
}): Promise<
  { success: true; addedCount: number; skippedCount: number } | { success: false; error: string }
> {
  const salon = await getAuthenticatedSalon();

  const [booking, client] = await Promise.all([
    prisma.booking.findFirst({
      where: { id: data.bookingId, salonId: salon.id },
      select: { id: true },
    }),
    prisma.client.findFirst({
      where: { id: data.clientId, salonId: salon.id },
      select: { id: true },
    }),
  ]);

  if (!booking) return { success: false, error: 'Booking not found' };
  if (!client) return { success: false, error: 'Client not found' };

  const preferred = await prisma.clientPreferredProduct.findMany({
    where: { clientId: data.clientId, pinned: true, productId: { not: null } },
    select: { productId: true },
  });

  if (preferred.length === 0) {
    return { success: true, addedCount: 0, skippedCount: 0 };
  }

  // Avoid duplicating products already on this booking
  const existing = await prisma.bookingProduct.findMany({
    where: { bookingId: data.bookingId },
    select: { productId: true },
  });
  const existingProductIds = new Set(existing.map((e) => e.productId));

  const toInsert = preferred
    .map((p) => p.productId!)
    .filter((pid) => !existingProductIds.has(pid))
    .map((productId) => ({ bookingId: data.bookingId, productId, quantity: 1 }));

  const skippedCount = preferred.length - toInsert.length;

  if (toInsert.length > 0) {
    await prisma.bookingProduct.createMany({ data: toInsert });
  }

  revalidatePath(`/bookings/${data.bookingId}`);
  return { success: true, addedCount: toInsert.length, skippedCount };
}

/**
 * Create a preferred product entry from a booking product (the "pin" flow).
 * The caller supplies the label; formula/notes are optional enrichment.
 */
export async function pinBookingProductToClient(data: {
  bookingProductId: string;
  clientId: string;
  label: string;
  formula?: string;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  if (!data.label?.trim()) {
    return { success: false, error: 'label is required' };
  }

  const bp = await prisma.bookingProduct.findFirst({
    where: { id: data.bookingProductId },
    include: { booking: { select: { salonId: true } } },
  });

  if (!bp || bp.booking.salonId !== salon.id) {
    return { success: false, error: 'Booking product not found' };
  }

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, salonId: salon.id },
    select: { id: true },
  });
  if (!client) return { success: false, error: 'Client not found' };

  const item = await prisma.clientPreferredProduct.create({
    data: {
      clientId: data.clientId,
      productId: bp.productId,
      label: data.label.trim(),
      formula: data.formula || null,
      notes: data.notes || null,
      pinned: true,
      salonId: salon.id,
    },
  });

  revalidatePath(`/clients/${data.clientId}`);
  return { success: true, id: item.id };
}

// ============================================================
// CLIENT PRODUCT HISTORY (aggregated read)
// ============================================================

export async function getClientProductHistory(clientId: string, limit = 100) {
  const salon = await getAuthenticatedSalon();

  const client = await prisma.client.findFirst({
    where: { id: clientId, salonId: salon.id },
    select: { id: true },
  });
  if (!client) return { success: false as const, error: 'Client not found' };

  const history = await prisma.bookingProduct.findMany({
    where: {
      booking: { clientId, salonId: salon.id },
    },
    include: {
      product: true,
      booking: { select: { id: true, startTime: true } },
    },
    orderBy: { booking: { startTime: 'desc' } },
    take: limit,
  });

  return { success: true as const, history };
}

// ============================================================
// REPEAT LAST VISIT PRODUCTS
// ============================================================

/**
 * Fetch the products from the client's most recent *other* booking
 * (i.e. not the current bookingId) that has at least one product logged.
 * Returns the products so the caller can bulk-create them on the current booking.
 */
export async function getLastVisitProducts(data: { bookingId: string; clientId: string }): Promise<
  | {
      success: true;
      products: Array<{ productId: string; quantity: number; notes: string | null }>;
      visitDate: Date;
    }
  | { success: true; products: []; visitDate: null }
  | { success: false; error: string }
> {
  const salon = await getAuthenticatedSalon();

  const [booking, client] = await Promise.all([
    prisma.booking.findFirst({
      where: { id: data.bookingId, salonId: salon.id },
      select: { id: true },
    }),
    prisma.client.findFirst({
      where: { id: data.clientId, salonId: salon.id },
      select: { id: true },
    }),
  ]);

  if (!booking) return { success: false, error: 'Booking not found' };
  if (!client) return { success: false, error: 'Client not found' };

  // Find the most recent booking for this client (other than the current one)
  // that has at least one product logged, ordered by start time desc
  const lastBooking = await prisma.booking.findFirst({
    where: {
      clientId: data.clientId,
      salonId: salon.id,
      id: { not: data.bookingId },
      productsUsed: { some: {} },
    },
    orderBy: { startTime: 'desc' },
    select: { id: true, startTime: true },
  });

  if (!lastBooking) {
    return { success: true, products: [], visitDate: null };
  }

  const products = await prisma.bookingProduct.findMany({
    where: { bookingId: lastBooking.id },
    select: { productId: true, quantity: true, notes: true },
  });

  return {
    success: true,
    products,
    visitDate: lastBooking.startTime,
  };
}

/**
 * Copy products from the client's last visit onto the current booking.
 * Skips products already on this booking.
 */
export async function repeatLastVisitProducts(data: {
  bookingId: string;
  clientId: string;
}): Promise<{ success: true; addedCount: number } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const [booking, client] = await Promise.all([
    prisma.booking.findFirst({
      where: { id: data.bookingId, salonId: salon.id },
      select: { id: true },
    }),
    prisma.client.findFirst({
      where: { id: data.clientId, salonId: salon.id },
      select: { id: true },
    }),
  ]);

  if (!booking) return { success: false, error: 'Booking not found' };
  if (!client) return { success: false, error: 'Client not found' };

  const lastBooking = await prisma.booking.findFirst({
    where: {
      clientId: data.clientId,
      salonId: salon.id,
      id: { not: data.bookingId },
      productsUsed: { some: {} },
    },
    orderBy: { startTime: 'desc' },
    select: { id: true },
  });

  if (!lastBooking) {
    return { success: true, addedCount: 0 };
  }

  const lastProducts = await prisma.bookingProduct.findMany({
    where: { bookingId: lastBooking.id },
    select: { productId: true, quantity: true, notes: true },
  });

  // Avoid duplicating products already on this booking
  const existing = await prisma.bookingProduct.findMany({
    where: { bookingId: data.bookingId },
    select: { productId: true },
  });
  const existingIds = new Set(existing.map((e) => e.productId));

  const toInsert = lastProducts
    .filter((p) => !existingIds.has(p.productId))
    .map((p) => ({
      bookingId: data.bookingId,
      productId: p.productId,
      quantity: p.quantity,
      notes: p.notes,
    }));

  if (toInsert.length > 0) {
    await prisma.bookingProduct.createMany({ data: toInsert });
  }

  revalidatePath(`/bookings/${data.bookingId}`);
  return { success: true, addedCount: toInsert.length };
}
