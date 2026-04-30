import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}));

import { getAuthenticatedSalon } from '@/server/auth';

beforeEach(() => {
  mockGetServerSession.mockReset();
  mockFindUnique.mockReset();
});

describe('getAuthenticatedSalon', () => {
  it('throws "Not authenticated" when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(getAuthenticatedSalon()).rejects.toThrow('Not authenticated');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('throws "Not authenticated" when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });

    await expect(getAuthenticatedSalon()).rejects.toThrow('Not authenticated');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('throws "No salon found" when user exists but has no salon', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', salon: null });

    await expect(getAuthenticatedSalon()).rejects.toThrow('No salon found');
  });

  it('throws "No salon found" when user not found in DB', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue(null);

    await expect(getAuthenticatedSalon()).rejects.toThrow('No salon found');
  });

  it('returns salon when authenticated user has a salon', async () => {
    const fakeSalon = { id: 'salon-1', name: 'Test Salon' };
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', salon: fakeSalon });

    const result = await getAuthenticatedSalon();

    expect(result).toEqual(fakeSalon);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      include: { salon: true },
    });
  });
});
