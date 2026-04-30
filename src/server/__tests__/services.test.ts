import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthenticatedSalon = vi.fn();
const mockServiceCreate = vi.fn();
const mockServiceFindFirst = vi.fn();
const mockServiceUpdate = vi.fn();
const mockCategoryCreate = vi.fn();
const mockCategoryFindFirst = vi.fn();
const mockCategoryDelete = vi.fn();
const mockStylistFindFirst = vi.fn();
const mockStylistServiceCreate = vi.fn();
const mockStylistServiceDelete = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/server/auth', () => ({
  getAuthenticatedSalon: (...args: unknown[]) => mockGetAuthenticatedSalon(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    service: {
      create: (...args: unknown[]) => mockServiceCreate(...args),
      findFirst: (...args: unknown[]) => mockServiceFindFirst(...args),
      update: (...args: unknown[]) => mockServiceUpdate(...args),
    },
    serviceCategory: {
      create: (...args: unknown[]) => mockCategoryCreate(...args),
      findFirst: (...args: unknown[]) => mockCategoryFindFirst(...args),
      delete: (...args: unknown[]) => mockCategoryDelete(...args),
    },
    stylist: {
      findFirst: (...args: unknown[]) => mockStylistFindFirst(...args),
    },
    stylistService: {
      create: (...args: unknown[]) => mockStylistServiceCreate(...args),
      delete: (...args: unknown[]) => mockStylistServiceDelete(...args),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import {
  createService,
  updateService,
  deleteService,
  createCategory,
  deleteCategory,
  assignStylistToService,
  removeStylistFromService,
} from '@/server/actions/services';

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthenticatedSalon.mockResolvedValue({ id: 'salon-1', name: 'Test Salon' });
});

describe('createService', () => {
  it('creates service with valid data', async () => {
    const fd = makeFormData({
      name: 'Haircut',
      price: '25.50',
      duration: '30',
      description: '',
      categoryId: '',
    });

    const result = await createService(fd);

    expect(result).toEqual({ success: true });
    expect(mockServiceCreate).toHaveBeenCalledWith({
      data: {
        name: 'Haircut',
        description: null,
        price: 2550,
        duration: 30,
        categoryId: null,
        salonId: 'salon-1',
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/services');
  });

  it('returns error for missing name', async () => {
    const fd = makeFormData({
      name: '',
      price: '10',
      duration: '30',
      description: '',
      categoryId: '',
    });

    const result = await createService(fd);

    expect(result).toEqual({ error: 'Name is required' });
    expect(mockServiceCreate).not.toHaveBeenCalled();
  });

  it('converts price from dollars to cents', async () => {
    const fd = makeFormData({
      name: 'Color',
      price: '10.99',
      duration: '60',
      description: '',
      categoryId: '',
    });

    await createService(fd);

    expect(mockServiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ price: 1099 }),
      })
    );
  });

  it('returns error for invalid price', async () => {
    const fd = makeFormData({
      name: 'Haircut',
      price: 'abc',
      duration: '30',
      description: '',
      categoryId: '',
    });

    const result = await createService(fd);

    expect(result).toEqual({ error: 'Price must be positive' });
    expect(mockServiceCreate).not.toHaveBeenCalled();
  });
});

describe('updateService', () => {
  it('updates existing service', async () => {
    mockServiceFindFirst.mockResolvedValue({ id: 'svc-1', salonId: 'salon-1' });

    const fd = makeFormData({
      name: 'Updated Cut',
      price: '30',
      duration: '45',
      description: '',
      categoryId: '',
    });
    const result = await updateService('svc-1', fd);

    expect(result).toEqual({ success: true });
    expect(mockServiceUpdate).toHaveBeenCalledWith({
      where: { id: 'svc-1' },
      data: {
        name: 'Updated Cut',
        description: null,
        price: 3000,
        duration: 45,
        categoryId: null,
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/services');
  });

  it('throws when service not found', async () => {
    mockServiceFindFirst.mockResolvedValue(null);

    const fd = makeFormData({
      name: 'Cut',
      price: '10',
      duration: '30',
      description: '',
      categoryId: '',
    });

    await expect(updateService('svc-999', fd)).rejects.toThrow('Service not found');
    expect(mockServiceUpdate).not.toHaveBeenCalled();
  });
});

describe('deleteService', () => {
  it('soft deletes service', async () => {
    mockServiceFindFirst.mockResolvedValue({ id: 'svc-1', salonId: 'salon-1' });

    const result = await deleteService('svc-1');

    expect(result).toEqual({ success: true });
    expect(mockServiceUpdate).toHaveBeenCalledWith({
      where: { id: 'svc-1' },
      data: { isActive: false },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/services');
  });

  it('throws when service not found', async () => {
    mockServiceFindFirst.mockResolvedValue(null);

    await expect(deleteService('svc-999')).rejects.toThrow('Service not found');
    expect(mockServiceUpdate).not.toHaveBeenCalled();
  });
});

describe('createCategory', () => {
  it('creates category with valid name', async () => {
    const fd = makeFormData({ name: 'Hair' });

    const result = await createCategory(fd);

    expect(result).toEqual({ success: true });
    expect(mockCategoryCreate).toHaveBeenCalledWith({
      data: {
        name: 'Hair',
        salonId: 'salon-1',
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/services');
  });

  it('returns error for empty name', async () => {
    const fd = makeFormData({ name: '' });

    const result = await createCategory(fd);

    expect(result).toEqual({ error: 'Category name is required' });
    expect(mockCategoryCreate).not.toHaveBeenCalled();
  });
});

describe('deleteCategory', () => {
  it('deletes category', async () => {
    mockCategoryFindFirst.mockResolvedValue({ id: 'cat-1', salonId: 'salon-1' });

    const result = await deleteCategory('cat-1');

    expect(result).toEqual({ success: true });
    expect(mockCategoryDelete).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/services');
  });

  it('throws when category not found', async () => {
    mockCategoryFindFirst.mockResolvedValue(null);

    await expect(deleteCategory('cat-999')).rejects.toThrow('Category not found');
    expect(mockCategoryDelete).not.toHaveBeenCalled();
  });
});

describe('assignStylistToService', () => {
  it('assigns stylist to service', async () => {
    mockStylistFindFirst.mockResolvedValue({ id: 'stylist-1', salonId: 'salon-1' });
    mockServiceFindFirst.mockResolvedValue({ id: 'svc-1', salonId: 'salon-1' });

    const result = await assignStylistToService('stylist-1', 'svc-1');

    expect(result).toEqual({ success: true });
    expect(mockStylistServiceCreate).toHaveBeenCalledWith({
      data: { stylistId: 'stylist-1', serviceId: 'svc-1' },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/services');
  });

  it('throws when stylist or service not found', async () => {
    mockStylistFindFirst.mockResolvedValue(null);
    mockServiceFindFirst.mockResolvedValue({ id: 'svc-1', salonId: 'salon-1' });

    await expect(assignStylistToService('stylist-999', 'svc-1')).rejects.toThrow(
      'Stylist or service not found'
    );
    expect(mockStylistServiceCreate).not.toHaveBeenCalled();
  });
});

describe('removeStylistFromService', () => {
  it('removes stylist from service', async () => {
    mockStylistFindFirst.mockResolvedValue({ id: 'stylist-1', salonId: 'salon-1' });
    mockServiceFindFirst.mockResolvedValue({ id: 'svc-1', salonId: 'salon-1' });

    const result = await removeStylistFromService('stylist-1', 'svc-1');

    expect(result).toEqual({ success: true });
    expect(mockStylistServiceDelete).toHaveBeenCalledWith({
      where: {
        stylistId_serviceId: { stylistId: 'stylist-1', serviceId: 'svc-1' },
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/services');
  });

  it('throws when stylist or service not found', async () => {
    mockStylistFindFirst.mockResolvedValue({ id: 'stylist-1', salonId: 'salon-1' });
    mockServiceFindFirst.mockResolvedValue(null);

    await expect(removeStylistFromService('stylist-1', 'svc-999')).rejects.toThrow(
      'Stylist or service not found'
    );
    expect(mockStylistServiceDelete).not.toHaveBeenCalled();
  });
});
