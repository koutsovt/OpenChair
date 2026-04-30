import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mockGetToken = vi.fn();

vi.mock('next-auth/jwt', () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

import { middleware } from '@/middleware';

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'));
}

beforeEach(() => {
  mockGetToken.mockReset();
});

describe('middleware', () => {
  it('allows /api/v1/ routes without auth', async () => {
    const result = await middleware(makeRequest('/api/v1/salon/test'));
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(200);
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('allows /sign-in without auth', async () => {
    const result = await middleware(makeRequest('/sign-in'));
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(200);
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('allows /sign-up without auth', async () => {
    const result = await middleware(makeRequest('/sign-up'));
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(200);
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('allows /api/auth routes without auth', async () => {
    const result = await middleware(makeRequest('/api/auth/signin'));
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(200);
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it('redirects to /sign-in when no token on protected route', async () => {
    mockGetToken.mockResolvedValue(null);
    const result = await middleware(makeRequest('/dashboard'));
    expect(result.status).toBe(307);
    expect(result.headers.get('location')).toContain('/sign-in');
  });

  it('allows protected routes when token exists', async () => {
    mockGetToken.mockResolvedValue({ id: 'user-1' });
    const result = await middleware(makeRequest('/dashboard'));
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(200);
  });
});
