import { describe, it, expect, vi } from 'vitest';
import { NextResponse } from 'next/server';

// Mock env before importing the module under test so CRON_SECRET is stable.
vi.mock('@/lib/env', () => ({
  env: { CRON_SECRET: 'test-secret-abc' },
}));

import { withCronAuth } from '../cron-auth';

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set('authorization', authHeader);
  return new Request('http://localhost/api/cron/test', { headers });
}

describe('withCronAuth', () => {
  const innerHandler = vi.fn(async () => NextResponse.json({ ok: true }));

  it('calls the inner handler and returns its response when bearer token is correct', async () => {
    const wrapped = withCronAuth(innerHandler);
    const req = makeRequest('Bearer test-secret-abc');
    const res = await wrapped(req);

    expect(innerHandler).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 401 when the authorization header is missing', async () => {
    const wrapped = withCronAuth(innerHandler);
    const req = makeRequest();
    const res = await wrapped(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when the bearer token is wrong', async () => {
    const wrapped = withCronAuth(innerHandler);
    const req = makeRequest('Bearer wrong-token');
    const res = await wrapped(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when authorization is present but not a Bearer scheme', async () => {
    const wrapped = withCronAuth(innerHandler);
    const req = makeRequest('Basic test-secret-abc');
    const res = await wrapped(req);

    expect(res.status).toBe(401);
  });

  it('does not call the inner handler on auth failure', async () => {
    innerHandler.mockClear();
    const wrapped = withCronAuth(innerHandler);
    await wrapped(makeRequest('Bearer bad'));

    expect(innerHandler).not.toHaveBeenCalled();
  });
});
