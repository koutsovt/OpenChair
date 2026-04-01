import { describe, it, expect } from 'vitest';
import { rateLimit } from '../rate-limit';

describe('rateLimit', () => {
  it('allows requests under the limit', () => {
    const key = `test-allow-${Date.now()}`;
    const result = rateLimit(key, { max: 3, windowMs: 60000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests over the limit', () => {
    const key = `test-block-${Date.now()}`;
    rateLimit(key, { max: 2, windowMs: 60000 });
    rateLimit(key, { max: 2, windowMs: 60000 });
    const result = rateLimit(key, { max: 2, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('returns remaining count correctly', () => {
    const key = `test-remaining-${Date.now()}`;
    const r1 = rateLimit(key, { max: 5, windowMs: 60000 });
    expect(r1.remaining).toBe(4);
    const r2 = rateLimit(key, { max: 5, windowMs: 60000 });
    expect(r2.remaining).toBe(3);
  });

  it('tracks different keys independently', () => {
    const keyA = `test-a-${Date.now()}`;
    const keyB = `test-b-${Date.now()}`;
    rateLimit(keyA, { max: 1, windowMs: 60000 });
    const resultA = rateLimit(keyA, { max: 1, windowMs: 60000 });
    const resultB = rateLimit(keyB, { max: 1, windowMs: 60000 });
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it('provides resetMs when blocked', () => {
    const key = `test-reset-${Date.now()}`;
    rateLimit(key, { max: 1, windowMs: 60000 });
    const result = rateLimit(key, { max: 1, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.resetMs).toBeGreaterThan(0);
    expect(result.resetMs).toBeLessThanOrEqual(60000);
  });
});
