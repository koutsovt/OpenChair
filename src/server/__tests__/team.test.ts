import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthenticatedSalon = vi.fn();
const mockStylistCreate = vi.fn();
const mockStylistFindFirst = vi.fn();
const mockStylistUpdate = vi.fn();
const mockAvailabilityDeleteMany = vi.fn();
const mockAvailabilityCreateMany = vi.fn();
const mockTransaction = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/server/auth', () => ({
  getAuthenticatedSalon: (...args: unknown[]) => mockGetAuthenticatedSalon(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stylist: {
      create: (...args: unknown[]) => mockStylistCreate(...args),
      findFirst: (...args: unknown[]) => mockStylistFindFirst(...args),
      update: (...args: unknown[]) => mockStylistUpdate(...args),
    },
    stylistAvailability: {
      deleteMany: (...args: unknown[]) => mockAvailabilityDeleteMany(...args),
      createMany: (...args: unknown[]) => mockAvailabilityCreateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import {
  createStylist,
  updateStylist,
  deleteStylist,
  updateAvailability,
} from '@/server/actions/team';

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

const defaultSalon = { id: 'salon-1', name: 'Test Salon' };

beforeEach(() => {
  vi.resetAllMocks();
  mockGetAuthenticatedSalon.mockResolvedValue(defaultSalon);
});

describe('createStylist', () => {
  it('creates stylist with valid data', async () => {
    mockStylistCreate.mockResolvedValue({ id: 'stylist-1', name: 'Jane' });

    const fd = makeFormData({
      name: 'Jane',
      email: 'jane@test.com',
      phone: '1234567890',
      bio: 'A great stylist',
    });
    const result = await createStylist(fd);

    expect(result).toEqual({ success: true });
    expect(mockStylistCreate).toHaveBeenCalledWith({
      data: {
        name: 'Jane',
        email: 'jane@test.com',
        phone: '1234567890',
        bio: 'A great stylist',
        salonId: 'salon-1',
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/team');
  });

  it('returns error for missing name', async () => {
    const fd = makeFormData({ email: 'jane@test.com' });
    const result = await createStylist(fd);

    expect(result).toEqual({ error: expect.any(String) });
    expect(mockStylistCreate).not.toHaveBeenCalled();
  });

  it('sets optional fields to null when empty', async () => {
    mockStylistCreate.mockResolvedValue({ id: 'stylist-1', name: 'Jane' });

    const fd = makeFormData({ name: 'Jane', email: '', phone: '', bio: '' });
    const result = await createStylist(fd);

    expect(result).toEqual({ success: true });
    expect(mockStylistCreate).toHaveBeenCalledWith({
      data: {
        name: 'Jane',
        email: null,
        phone: null,
        bio: null,
        salonId: 'salon-1',
      },
    });
  });
});

describe('updateStylist', () => {
  it('updates existing stylist', async () => {
    mockStylistFindFirst.mockResolvedValue({ id: 'stylist-1', salonId: 'salon-1', name: 'Jane' });
    mockStylistUpdate.mockResolvedValue({ id: 'stylist-1', name: 'Jane Updated' });

    const fd = makeFormData({ name: 'Jane Updated', email: 'jane@new.com', phone: '', bio: '' });
    const result = await updateStylist('stylist-1', fd);

    expect(result).toEqual({ success: true });
    expect(mockStylistFindFirst).toHaveBeenCalledWith({
      where: { id: 'stylist-1', salonId: 'salon-1' },
    });
    expect(mockStylistUpdate).toHaveBeenCalledWith({
      where: { id: 'stylist-1' },
      data: {
        name: 'Jane Updated',
        email: 'jane@new.com',
        phone: null,
        bio: null,
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/team');
  });

  it('throws when stylist not found', async () => {
    mockStylistFindFirst.mockResolvedValue(null);

    const fd = makeFormData({ name: 'Jane' });
    await expect(updateStylist('nonexistent', fd)).rejects.toThrow('Stylist not found');
    expect(mockStylistUpdate).not.toHaveBeenCalled();
  });
});

describe('deleteStylist', () => {
  it('soft deletes stylist', async () => {
    mockStylistFindFirst.mockResolvedValue({ id: 'stylist-1', salonId: 'salon-1', name: 'Jane' });
    mockStylistUpdate.mockResolvedValue({ id: 'stylist-1', isActive: false });

    const result = await deleteStylist('stylist-1');

    expect(result).toEqual({ success: true });
    expect(mockStylistFindFirst).toHaveBeenCalledWith({
      where: { id: 'stylist-1', salonId: 'salon-1' },
    });
    expect(mockStylistUpdate).toHaveBeenCalledWith({
      where: { id: 'stylist-1' },
      data: { isActive: false },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/team');
  });

  it('throws when stylist not found', async () => {
    mockStylistFindFirst.mockResolvedValue(null);

    await expect(deleteStylist('nonexistent')).rejects.toThrow('Stylist not found');
    expect(mockStylistUpdate).not.toHaveBeenCalled();
  });
});

describe('updateAvailability', () => {
  const validAvailability = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
    { dayOfWeek: 2, startTime: '10:00', endTime: '18:00', isActive: true },
  ];

  it('replaces availability with transaction', async () => {
    mockStylistFindFirst.mockResolvedValue({ id: 'stylist-1', salonId: 'salon-1', name: 'Jane' });
    mockAvailabilityDeleteMany.mockReturnValue('deleteOp');
    mockAvailabilityCreateMany.mockReturnValue('createOp');
    mockTransaction.mockImplementation((ops: unknown[]) => Promise.resolve(ops));

    const result = await updateAvailability('stylist-1', validAvailability);

    expect(result).toEqual({ success: true });
    expect(mockStylistFindFirst).toHaveBeenCalledWith({
      where: { id: 'stylist-1', salonId: 'salon-1' },
    });
    expect(mockAvailabilityDeleteMany).toHaveBeenCalledWith({
      where: { stylistId: 'stylist-1' },
    });
    expect(mockAvailabilityCreateMany).toHaveBeenCalledWith({
      data: [
        {
          stylistId: 'stylist-1',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
        },
        {
          stylistId: 'stylist-1',
          dayOfWeek: 2,
          startTime: '10:00',
          endTime: '18:00',
          isActive: true,
        },
      ],
    });
    expect(mockTransaction).toHaveBeenCalledWith(['deleteOp', 'createOp']);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/team');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/team/stylist-1');
  });

  it('throws when stylist not found', async () => {
    mockStylistFindFirst.mockResolvedValue(null);

    await expect(updateAvailability('nonexistent', validAvailability)).rejects.toThrow(
      'Stylist not found'
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns error for invalid availability data', async () => {
    mockStylistFindFirst.mockResolvedValue({ id: 'stylist-1', salonId: 'salon-1', name: 'Jane' });

    const invalidAvailability = [
      { dayOfWeek: 8, startTime: 'bad', endTime: '17:00', isActive: true },
    ];
    const result = await updateAvailability('stylist-1', invalidAvailability);

    expect(result).toEqual({ error: 'Invalid availability data' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
