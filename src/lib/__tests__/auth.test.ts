import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}));

import { getAuthenticatedSalon } from '@/server/auth';

beforeEach(() => {
  mockGetUser.mockReset();
  mockFindUnique.mockReset();
});

describe('getAuthenticatedSalon', () => {
  it('throws "Not authenticated" when no auth user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(getAuthenticatedSalon()).rejects.toThrow('Not authenticated');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('throws "No salon found" when user exists but has no salon', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supabase-1' } } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', salon: null });

    await expect(getAuthenticatedSalon()).rejects.toThrow('No salon found');
  });

  it('throws "No salon found" when user not found in DB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supabase-1' } } });
    mockFindUnique.mockResolvedValue(null);

    await expect(getAuthenticatedSalon()).rejects.toThrow('No salon found');
  });

  it('returns salon when authenticated user has a salon', async () => {
    const fakeSalon = { id: 'salon-1', name: 'Test Salon' };
    mockGetUser.mockResolvedValue({ data: { user: { id: 'supabase-1' } } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', salon: fakeSalon });

    const result = await getAuthenticatedSalon();

    expect(result).toEqual(fakeSalon);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { supabaseId: 'supabase-1' },
      include: { salon: true },
    });
  });
});
