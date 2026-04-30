import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthenticatedSalon = vi.fn();
const mockClientCreate = vi.fn();
const mockClientFindFirst = vi.fn();
const mockClientFindMany = vi.fn();
const mockClientUpdate = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/server/auth', () => ({
  getAuthenticatedSalon: (...args: unknown[]) => mockGetAuthenticatedSalon(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: {
      create: (...args: unknown[]) => mockClientCreate(...args),
      findFirst: (...args: unknown[]) => mockClientFindFirst(...args),
      findMany: (...args: unknown[]) => mockClientFindMany(...args),
      update: (...args: unknown[]) => mockClientUpdate(...args),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import { createClient, updateClient, deleteClient, searchClients } from '@/server/actions/clients';

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

const defaultSalon = { id: 'salon-1', name: 'Test Salon' };

/** Base valid client fields — includes all optional fields as empty strings to satisfy zod */
const validFields: Record<string, string> = {
  name: 'John',
  phone: '0412345678',
  email: '',
  notes: '',
  birthDate: '',
  source: '',
};

beforeEach(() => {
  mockGetAuthenticatedSalon.mockReset();
  mockClientCreate.mockReset();
  mockClientFindFirst.mockReset();
  mockClientFindMany.mockReset();
  mockClientUpdate.mockReset();
  mockRevalidatePath.mockReset();

  mockGetAuthenticatedSalon.mockResolvedValue(defaultSalon);
});

describe('createClient', () => {
  it('creates client with valid data', async () => {
    mockClientFindMany.mockResolvedValue([]);
    mockClientCreate.mockResolvedValue({ id: 'c1', name: 'John', phone: '0412345678' });

    const result = await createClient(makeFormData(validFields));

    expect(result).toEqual({ success: true });
    expect(mockClientCreate).toHaveBeenCalledOnce();
    expect(mockClientCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'John',
        phone: '0412345678',
        salonId: 'salon-1',
      }),
    });
  });

  it('returns error when name is missing', async () => {
    const result = await createClient(makeFormData({ ...validFields, name: '' }));

    expect(result).toEqual({ error: 'Name is required' });
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it('returns error when phone is missing', async () => {
    const result = await createClient(makeFormData({ ...validFields, phone: '' }));

    expect(result).toEqual({ error: 'Phone number is required' });
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it('detects duplicate phone number', async () => {
    mockClientFindMany.mockResolvedValue([{ id: 'c1', name: 'Existing', phone: '0412345678' }]);

    const result = await createClient(makeFormData({ ...validFields, phone: '0412-345-678' }));

    expect(result).toEqual({ error: expect.stringContaining('already exists') });
    expect(mockClientCreate).not.toHaveBeenCalled();
  });

  it('revalidates /clients path on success', async () => {
    mockClientFindMany.mockResolvedValue([]);
    mockClientCreate.mockResolvedValue({ id: 'c1' });

    await createClient(makeFormData({ ...validFields, phone: '0400000000' }));

    expect(mockRevalidatePath).toHaveBeenCalledWith('/clients');
  });
});

describe('updateClient', () => {
  it('updates client with valid data', async () => {
    mockClientFindFirst.mockResolvedValue({ id: 'c1', name: 'Old Name', salonId: 'salon-1' });
    mockClientUpdate.mockResolvedValue({ id: 'c1', name: 'New Name' });

    const result = await updateClient(
      'c1',
      makeFormData({ ...validFields, name: 'New Name', phone: '0400000000' })
    );

    expect(result).toEqual({ success: true });
    expect(mockClientUpdate).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({ name: 'New Name' }),
    });
  });

  it('throws when client not found', async () => {
    mockClientFindFirst.mockResolvedValue(null);

    await expect(
      updateClient('nonexistent', makeFormData({ ...validFields, phone: '0400000000' }))
    ).rejects.toThrow('Client not found');
  });

  it('returns validation error for invalid data', async () => {
    mockClientFindFirst.mockResolvedValue({ id: 'c1', name: 'Old', salonId: 'salon-1' });

    const result = await updateClient('c1', makeFormData({ ...validFields, name: '' }));

    expect(result).toEqual({ error: 'Name is required' });
    expect(mockClientUpdate).not.toHaveBeenCalled();
  });
});

describe('deleteClient', () => {
  it('soft deletes client', async () => {
    mockClientFindFirst.mockResolvedValue({ id: 'c1', name: 'John', salonId: 'salon-1' });
    mockClientUpdate.mockResolvedValue({ id: 'c1', isActive: false });

    const result = await deleteClient('c1');

    expect(result).toEqual({ success: true });
    expect(mockClientUpdate).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { isActive: false },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/clients');
  });

  it('throws when client not found', async () => {
    mockClientFindFirst.mockResolvedValue(null);

    await expect(deleteClient('nonexistent')).rejects.toThrow('Client not found');
    expect(mockClientUpdate).not.toHaveBeenCalled();
  });
});

describe('searchClients', () => {
  it('returns matching clients', async () => {
    const clients = [
      { id: 'c1', name: 'Alice', phone: '0411111111', email: 'alice@test.com' },
      { id: 'c2', name: 'Bob', phone: '0422222222', email: 'bob@test.com' },
    ];
    mockClientFindMany.mockResolvedValue(clients);

    const result = await searchClients('Ali');

    expect(result).toEqual(clients);
    expect(mockClientFindMany).toHaveBeenCalledWith({
      where: {
        salonId: 'salon-1',
        isActive: true,
        OR: [
          { name: { contains: 'Ali' } },
          { phone: { contains: 'Ali' } },
          { email: { contains: 'Ali' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  });
});
