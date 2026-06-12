import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any imports of the modules under test
// ---------------------------------------------------------------------------

const mockGetAuthenticatedSalon = vi.fn();

const mockProductFindFirst = vi.fn();
const mockProductFindMany = vi.fn();
const mockProductCreate = vi.fn();
const mockProductUpdate = vi.fn();
const mockProductCreateManyAndReturn = vi.fn();

const mockBookingFindFirst = vi.fn();
const mockBookingProductFindFirst = vi.fn();
const mockBookingProductFindMany = vi.fn();
const mockBookingProductCreate = vi.fn();
const mockBookingProductCreateMany = vi.fn();
const mockBookingProductDelete = vi.fn();
const mockBookingProductUpdate = vi.fn();

const mockClientFindFirst = vi.fn();

const mockClientPreferredFindFirst = vi.fn();
const mockClientPreferredFindMany = vi.fn();
const mockClientPreferredCreate = vi.fn();
const mockClientPreferredUpdate = vi.fn();
const mockClientPreferredDelete = vi.fn();

const mockRevalidatePath = vi.fn();

vi.mock('@/server/auth', () => ({
  getAuthenticatedSalon: (...args: unknown[]) => mockGetAuthenticatedSalon(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    product: {
      findFirst: (...args: unknown[]) => mockProductFindFirst(...args),
      findMany: (...args: unknown[]) => mockProductFindMany(...args),
      create: (...args: unknown[]) => mockProductCreate(...args),
      update: (...args: unknown[]) => mockProductUpdate(...args),
      createManyAndReturn: (...args: unknown[]) => mockProductCreateManyAndReturn(...args),
    },
    booking: {
      findFirst: (...args: unknown[]) => mockBookingFindFirst(...args),
    },
    bookingProduct: {
      findFirst: (...args: unknown[]) => mockBookingProductFindFirst(...args),
      findMany: (...args: unknown[]) => mockBookingProductFindMany(...args),
      create: (...args: unknown[]) => mockBookingProductCreate(...args),
      createMany: (...args: unknown[]) => mockBookingProductCreateMany(...args),
      update: (...args: unknown[]) => mockBookingProductUpdate(...args),
      delete: (...args: unknown[]) => mockBookingProductDelete(...args),
    },
    client: {
      findFirst: (...args: unknown[]) => mockClientFindFirst(...args),
    },
    clientPreferredProduct: {
      findFirst: (...args: unknown[]) => mockClientPreferredFindFirst(...args),
      findMany: (...args: unknown[]) => mockClientPreferredFindMany(...args),
      create: (...args: unknown[]) => mockClientPreferredCreate(...args),
      update: (...args: unknown[]) => mockClientPreferredUpdate(...args),
      delete: (...args: unknown[]) => mockClientPreferredDelete(...args),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import {
  createProduct,
  archiveProduct,
  importProductsCsv,
  addProductToBooking,
  applyPreferredProductsToBooking,
  getClientProductHistory,
} from '@/server/actions/products';

const defaultSalon = { id: 'salon-1', name: 'Test Salon' };
const defaultProduct = {
  id: 'prod-1',
  brand: 'Wella Professionals',
  name: 'Koleston Perfect',
  shadeCode: '7/3',
  sku: null,
  category: 'COLOUR',
  unit: 'TUBE',
  notes: null,
  archivedAt: null,
  salonId: 'salon-1',
};

beforeEach(() => {
  vi.resetAllMocks();
  mockGetAuthenticatedSalon.mockResolvedValue(defaultSalon);
});

// ---------------------------------------------------------------------------
// createProduct
// ---------------------------------------------------------------------------

describe('createProduct', () => {
  it('creates a product successfully', async () => {
    mockProductFindFirst.mockResolvedValue(null); // no duplicate
    mockProductCreate.mockResolvedValue({ id: 'prod-new' });

    const result = await createProduct({
      brand: 'Wella Professionals',
      name: 'Koleston Perfect',
      shadeCode: '7/3',
      category: 'COLOUR' as const,
      unit: 'TUBE' as const,
    });

    expect(result).toEqual({ success: true, productId: 'prod-new' });
    expect(mockProductCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ salonId: 'salon-1' }) })
    );
  });

  it('returns error when duplicate exists', async () => {
    mockProductFindFirst.mockResolvedValue({ id: 'prod-1', archivedAt: null });

    const result = await createProduct({
      brand: 'Wella Professionals',
      name: 'Koleston Perfect',
      shadeCode: '7/3',
      category: 'COLOUR' as const,
      unit: 'TUBE' as const,
    });

    expect(result).toEqual({ success: false, error: expect.stringContaining('already exists') });
    expect(mockProductCreate).not.toHaveBeenCalled();
  });

  it('returns error for invalid category', async () => {
    const result = await createProduct({
      brand: 'Wella',
      name: 'Test',
      category: 'INVALID_CAT' as never,
      unit: 'TUBE' as const,
    });

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(mockProductFindFirst).not.toHaveBeenCalled();
  });

  it('enforces salonId — never writes to another salon', async () => {
    // Auth returns salon-1; product should always be created with salonId salon-1
    mockProductFindFirst.mockResolvedValue(null);
    mockProductCreate.mockResolvedValue({ id: 'prod-new' });

    await createProduct({
      brand: 'Wella',
      name: 'Test',
      category: 'COLOUR' as const,
      unit: 'TUBE' as const,
    });

    const callArg = mockProductCreate.mock.calls[0][0];
    expect(callArg.data.salonId).toBe('salon-1');
  });
});

// ---------------------------------------------------------------------------
// archiveProduct
// ---------------------------------------------------------------------------

describe('archiveProduct', () => {
  it('archives an active product', async () => {
    mockProductFindFirst.mockResolvedValue(defaultProduct);
    mockProductUpdate.mockResolvedValue({ ...defaultProduct, archivedAt: new Date() });

    const result = await archiveProduct('prod-1');

    expect(result).toEqual({ success: true });
    expect(mockProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ archivedAt: expect.any(Date) }) })
    );
  });

  it('returns error if product belongs to different salon', async () => {
    // findFirst with salonId: salon-1 returns null (cross-tenant attempt)
    mockProductFindFirst.mockResolvedValue(null);

    const result = await archiveProduct('prod-other-salon');

    expect(result).toEqual({ success: false, error: 'Product not found' });
    expect(mockProductUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// importProductsCsv
// ---------------------------------------------------------------------------

describe('importProductsCsv', () => {
  const insertedRow = (overrides: Record<string, unknown>) => ({
    id: 'prod-new',
    brand: 'Wella Professionals',
    name: 'Koleston Perfect',
    shadeCode: null,
    sku: null,
    category: 'COLOUR',
    unit: 'TUBE',
    notes: null,
    archivedAt: null,
    ...overrides,
  });

  it('inserts valid rows and skips DB duplicates by default', async () => {
    mockProductFindMany.mockResolvedValue([
      { id: 'prod-1', brand: 'Wella Professionals', name: 'Koleston Perfect', shadeCode: '7/3' },
    ]);
    mockProductCreateManyAndReturn.mockResolvedValue([
      insertedRow({ id: 'prod-new-1', shadeCode: '9/0' }),
      insertedRow({ id: 'prod-new-2', brand: 'Kevin Murphy', name: 'ANGEL.WASH' }),
    ]);

    const result = await importProductsCsv([
      // already in DB — should be skipped
      {
        brand: 'Wella Professionals',
        name: 'Koleston Perfect',
        shade_code: '7/3',
        category: 'colour',
        unit: 'tube',
      },
      // new — should be inserted
      {
        brand: 'Wella Professionals',
        name: 'Koleston Perfect',
        shade_code: '9/0',
        category: 'colour',
        unit: 'tube',
      },
      // new — should be inserted
      { brand: 'Kevin Murphy', name: 'ANGEL.WASH', category: 'shampoo', unit: 'bottle' },
    ]);

    expect(result.inserted).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.products).toHaveLength(2);
    expect(mockProductUpdate).not.toHaveBeenCalled();
  });

  it('updates matched existing rows when updateExisting is set', async () => {
    mockProductFindMany.mockResolvedValue([
      { id: 'prod-1', brand: 'Wella Professionals', name: 'Koleston Perfect', shadeCode: '7/3' },
    ]);
    mockProductUpdate.mockResolvedValue(
      insertedRow({ id: 'prod-1', shadeCode: '7/3', notes: 'Golden warm brown' })
    );

    const result = await importProductsCsv(
      [
        {
          brand: 'Wella Professionals',
          name: 'Koleston Perfect',
          shade_code: '7/3',
          category: 'colour',
          unit: 'tube',
          notes: 'Golden warm brown',
        },
      ],
      { updateExisting: true }
    );

    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(0);
    expect(mockProductCreateManyAndReturn).not.toHaveBeenCalled();
    expect(mockProductUpdate).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { sku: null, category: 'COLOUR', unit: 'TUBE', notes: 'Golden warm brown' },
    });
    expect(result.products).toHaveLength(1);
    expect(result.products[0].notes).toBe('Golden warm brown');
  });

  it('reports validation errors per row without stopping other rows', async () => {
    mockProductFindMany.mockResolvedValue([]);
    mockProductCreateManyAndReturn.mockResolvedValue([
      insertedRow({ brand: 'Kevin Murphy', name: 'ANGEL.WASH' }),
    ]);

    const result = await importProductsCsv([
      { brand: 'Wella', name: 'Test', category: 'colur', unit: 'tube' }, // typo in category
      { brand: 'Kevin Murphy', name: 'ANGEL.WASH', category: 'shampoo', unit: 'bottle' }, // valid
    ]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(2); // row 2 (1-indexed + header)
    expect(result.errors[0].message).toMatch(/colour|category|invalid/i);
    expect(result.inserted).toBe(1);
  });

  it('detects duplicates within the upload batch', async () => {
    mockProductFindMany.mockResolvedValue([]);
    mockProductCreateManyAndReturn.mockResolvedValue([insertedRow({ shadeCode: '7/3' })]);

    const result = await importProductsCsv([
      { brand: 'Wella', name: 'Koleston', shade_code: '7/3', category: 'colour', unit: 'tube' },
      { brand: 'Wella', name: 'Koleston', shade_code: '7/3', category: 'colour', unit: 'tube' }, // dup
    ]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/duplicate/i);
    expect(result.inserted).toBe(1);
  });

  it('returns all skipped when all rows are invalid', async () => {
    mockProductFindMany.mockResolvedValue([]);

    const result = await importProductsCsv([
      { brand: '', name: 'Test', category: 'colour', unit: 'tube' },
    ]);

    expect(result.inserted).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.products).toHaveLength(0);
    expect(mockProductCreateManyAndReturn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// applyPreferredProductsToBooking
// ---------------------------------------------------------------------------

describe('applyPreferredProductsToBooking', () => {
  const bookingId = 'booking-1';
  const clientId = 'client-1';

  it('bulk-inserts pinned preferred products, skipping already-added ones', async () => {
    mockBookingFindFirst.mockResolvedValue({ id: bookingId });
    mockClientFindFirst.mockResolvedValue({ id: clientId });
    mockClientPreferredFindMany.mockResolvedValue([
      { productId: 'prod-1' },
      { productId: 'prod-2' },
      { productId: 'prod-3' },
    ]);
    // prod-1 already on this booking
    mockBookingProductFindMany.mockResolvedValue([{ productId: 'prod-1' }]);
    mockBookingProductCreateMany.mockResolvedValue({ count: 2 });

    const result = await applyPreferredProductsToBooking({ bookingId, clientId });

    expect(result).toEqual({ success: true, addedCount: 2, skippedCount: 1 });
    expect(mockBookingProductCreateMany).toHaveBeenCalledWith({
      data: [
        { bookingId, productId: 'prod-2', quantity: 1 },
        { bookingId, productId: 'prod-3', quantity: 1 },
      ],
    });
  });

  it('returns success with 0 added when no pinned preferred products exist', async () => {
    mockBookingFindFirst.mockResolvedValue({ id: bookingId });
    mockClientFindFirst.mockResolvedValue({ id: clientId });
    mockClientPreferredFindMany.mockResolvedValue([]);

    const result = await applyPreferredProductsToBooking({ bookingId, clientId });

    expect(result).toEqual({ success: true, addedCount: 0, skippedCount: 0 });
    expect(mockBookingProductCreateMany).not.toHaveBeenCalled();
  });

  it('rejects when booking belongs to different salon', async () => {
    mockBookingFindFirst.mockResolvedValue(null); // salonId scoping returns null
    mockClientFindFirst.mockResolvedValue({ id: clientId });

    const result = await applyPreferredProductsToBooking({ bookingId, clientId });

    expect(result).toEqual({ success: false, error: 'Booking not found' });
    expect(mockBookingProductCreateMany).not.toHaveBeenCalled();
  });

  it('rejects when client belongs to different salon', async () => {
    mockBookingFindFirst.mockResolvedValue({ id: bookingId });
    mockClientFindFirst.mockResolvedValue(null); // cross-tenant

    const result = await applyPreferredProductsToBooking({ bookingId, clientId });

    expect(result).toEqual({ success: false, error: 'Client not found' });
    expect(mockBookingProductCreateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// addProductToBooking — salon scoping
// ---------------------------------------------------------------------------

describe('addProductToBooking — salon scoping', () => {
  it('rejects when product salonId does not match', async () => {
    mockBookingFindFirst.mockResolvedValue({ id: 'booking-1' });
    mockProductFindFirst.mockResolvedValue(null); // product from another salon

    const result = await addProductToBooking({
      bookingId: 'booking-1',
      productId: 'prod-other',
      quantity: 1,
    });

    expect(result).toEqual({ success: false, error: 'Product not found' });
    expect(mockBookingProductCreate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getClientProductHistory
// ---------------------------------------------------------------------------

describe('getClientProductHistory', () => {
  it('returns history scoped to salonId', async () => {
    mockClientFindFirst.mockResolvedValue({ id: 'client-1' });
    const fakeHistory = [
      {
        id: 'bp-1',
        product: defaultProduct,
        booking: { id: 'booking-1', startTime: new Date('2026-05-01') },
      },
    ];
    mockBookingProductFindMany.mockResolvedValue(fakeHistory);

    const result = await getClientProductHistory('client-1');

    expect(result).toEqual({ success: true, history: fakeHistory });
    // The query must include salonId scoping via booking
    const call = mockBookingProductFindMany.mock.calls[0][0];
    expect(call.where.booking).toMatchObject({ clientId: 'client-1', salonId: 'salon-1' });
  });

  it('returns error when client not in salon', async () => {
    mockClientFindFirst.mockResolvedValue(null);

    const result = await getClientProductHistory('client-other-salon');

    expect(result).toEqual({ success: false, error: 'Client not found' });
    expect(mockBookingProductFindMany).not.toHaveBeenCalled();
  });
});
