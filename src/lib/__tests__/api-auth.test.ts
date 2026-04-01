import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    salon: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}));

import { authenticateSalonByApiKey } from '../api-auth';

beforeEach(() => {
  mockFindUnique.mockReset();
});

function makeRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/v1/sms/send', { headers });
}

describe('authenticateSalonByApiKey', () => {
  it('returns null when no Authorization header', async () => {
    const result = await authenticateSalonByApiKey(makeRequest());
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns null when Authorization does not start with Bearer', async () => {
    const result = await authenticateSalonByApiKey(makeRequest({ authorization: 'Basic abc123' }));
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns null when Bearer token is empty', async () => {
    const result = await authenticateSalonByApiKey(makeRequest({ authorization: 'Bearer ' }));
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns salon when valid API key matches', async () => {
    const fakeSalon = { id: 'salon-1', name: 'Test Salon', apiKey: 'valid-key' };
    mockFindUnique.mockResolvedValue(fakeSalon);

    const result = await authenticateSalonByApiKey(
      makeRequest({ authorization: 'Bearer valid-key' })
    );

    expect(result).toEqual(fakeSalon);
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { apiKey: 'valid-key' } });
  });

  it('returns null when API key not found in database', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await authenticateSalonByApiKey(
      makeRequest({ authorization: 'Bearer unknown-key' })
    );

    expect(result).toBeNull();
  });
});
