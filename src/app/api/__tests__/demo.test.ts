/**
 * /demo magic-link route tests — vi.hoisted pattern.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    prismaUser: { findUnique: fn() },
    encode: fn(),
    rateLimit: fn(),
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: mocks.prismaUser.findUnique } },
}));

vi.mock('next-auth/jwt', () => ({
  encode: mocks.encode,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_SECRET: 'test-secret',
    CRON_SECRET: 'cron',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

import { GET } from '@/app/demo/route';

const demoUser = {
  id: 'user-demo-1',
  email: 'demo@openchair.dev',
  firstName: 'Demo',
  lastName: 'User',
};

function makeRequest(url = 'http://localhost:3000/demo') {
  return new Request(url, { method: 'GET' });
}

describe('GET /demo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockReturnValue({ allowed: true, remaining: 9, resetMs: 60000 });
    mocks.encode.mockResolvedValue('signed.jwt.token');
  });

  it('redirects to /dashboard when demo user exists', async () => {
    mocks.prismaUser.findUnique.mockResolvedValue(demoUser);

    const res = await GET(makeRequest() as never);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch('/dashboard');
  });

  it('sets a session cookie on redirect', async () => {
    mocks.prismaUser.findUnique.mockResolvedValue(demoUser);

    const res = await GET(makeRequest() as never);

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/next-auth\.session-token/);
    expect(setCookie).toMatch('signed.jwt.token');
  });

  it('encodes a JWT with the demo user id and email', async () => {
    mocks.prismaUser.findUnique.mockResolvedValue(demoUser);

    await GET(makeRequest() as never);

    expect(mocks.encode).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({
          id: demoUser.id,
          email: demoUser.email,
        }),
        secret: 'test-secret',
      })
    );
  });

  it('returns 404 when demo user does not exist in the database', async () => {
    mocks.prismaUser.findUnique.mockResolvedValue(null);

    const res = await GET(makeRequest() as never);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('returns 429 when rate-limit is exceeded', async () => {
    mocks.rateLimit.mockReturnValue({ allowed: false, remaining: 0, resetMs: 30000 });

    const res = await GET(makeRequest() as never);

    expect(res.status).toBe(429);
    expect(mocks.prismaUser.findUnique).not.toHaveBeenCalled();
  });

  it('only queries for the hard-coded demo email (cannot be hijacked by request params)', async () => {
    mocks.prismaUser.findUnique.mockResolvedValue(demoUser);

    await GET(makeRequest('http://localhost:3000/demo?email=attacker@evil.com') as never);

    // Must always query for the hard-coded demo email, ignoring query params
    expect(mocks.prismaUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'demo@openchair.dev' },
      })
    );
  });
});
