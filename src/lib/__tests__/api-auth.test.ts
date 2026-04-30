import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hash } from 'bcryptjs';

const mockFindMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    salon: { findMany: (...args: unknown[]) => mockFindMany(...args) },
  },
}));

import { authenticateSalonByApiKey } from '../api-auth';

beforeEach(() => {
  mockFindMany.mockReset();
});

function makeRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/v1/sms/send', { headers });
}

describe('authenticateSalonByApiKey', () => {
  it('returns null when no Authorization header', async () => {
    const result = await authenticateSalonByApiKey(makeRequest());
    expect(result).toBeNull();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns null when Authorization does not start with Bearer', async () => {
    const result = await authenticateSalonByApiKey(makeRequest({ authorization: 'Basic abc123' }));
    expect(result).toBeNull();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns null when Bearer token is empty', async () => {
    const result = await authenticateSalonByApiKey(makeRequest({ authorization: 'Bearer ' }));
    expect(result).toBeNull();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns salon when valid API key matches', async () => {
    const hashedKey = await hash('valid-key', 10);
    const fakeSalon = { id: 'salon-1', name: 'Test Salon', apiKey: hashedKey };
    mockFindMany.mockResolvedValue([fakeSalon]);

    const result = await authenticateSalonByApiKey(
      makeRequest({ authorization: 'Bearer valid-key' })
    );

    expect(result).toEqual(fakeSalon);
  });

  it('returns null when API key not found in database', async () => {
    const hashedKey = await hash('other-key', 10);
    mockFindMany.mockResolvedValue([{ id: 'salon-1', apiKey: hashedKey }]);

    const result = await authenticateSalonByApiKey(
      makeRequest({ authorization: 'Bearer unknown-key' })
    );

    expect(result).toBeNull();
  });
});
