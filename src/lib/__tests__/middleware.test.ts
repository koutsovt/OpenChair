import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockUpdateSession = vi.fn().mockResolvedValue(new Response());

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

import { middleware } from '@/middleware';

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'http://localhost:3000'));
}

beforeEach(() => {
  mockUpdateSession.mockClear();
});

describe('middleware', () => {
  it('skips Supabase session for /api/v1/ routes', async () => {
    const result = await middleware(makeRequest('/api/v1/salon/test'));
    expect(result).toBeUndefined();
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });

  it('skips Supabase session for /api/v1/sms/webhook', async () => {
    const result = await middleware(makeRequest('/api/v1/sms/webhook'));
    expect(result).toBeUndefined();
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });

  it('skips Supabase session for /api/v1/bookings', async () => {
    const result = await middleware(makeRequest('/api/v1/bookings'));
    expect(result).toBeUndefined();
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });

  it('calls updateSession for non-API routes', async () => {
    await middleware(makeRequest('/dashboard'));
    expect(mockUpdateSession).toHaveBeenCalledOnce();
  });

  it('calls updateSession for /bookings (non v1)', async () => {
    await middleware(makeRequest('/bookings'));
    expect(mockUpdateSession).toHaveBeenCalledOnce();
  });

  it('calls updateSession for root path', async () => {
    await middleware(makeRequest('/'));
    expect(mockUpdateSession).toHaveBeenCalledOnce();
  });
});
