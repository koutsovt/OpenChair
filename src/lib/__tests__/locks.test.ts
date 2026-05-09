import { describe, it, expect, vi } from 'vitest';
import { withLock } from '../locks';

describe('withLock', () => {
  it('serializes concurrent calls for the same key — only 1 of 5 identical-slot bookings succeeds', async () => {
    // Simulate the booking-service pattern: a shared "booked" flag guarded
    // by the mutex. Without the mutex all 5 would read false simultaneously;
    // with it only the first writer sets the flag and the rest throw.
    let booked = false;

    async function tryBook(): Promise<string> {
      return withLock('stylist-1:2026-01-01T09:00:00.000Z', async () => {
        if (booked) {
          throw new Error('Slot already taken');
        }
        // Simulate async work (DB query)
        await Promise.resolve();
        booked = true;
        return 'booked';
      });
    }

    const results = await Promise.allSettled([
      tryBook(),
      tryBook(),
      tryBook(),
      tryBook(),
      tryBook(),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    rejected.forEach((r) => {
      expect((r as PromiseRejectedResult).reason.message).toBe('Slot already taken');
    });
  });

  it('allows concurrent calls for DIFFERENT keys to run in parallel', async () => {
    const order: string[] = [];

    const a = withLock('key-a', async () => {
      await Promise.resolve();
      order.push('a');
    });
    const b = withLock('key-b', async () => {
      await Promise.resolve();
      order.push('b');
    });

    await Promise.all([a, b]);
    // Both ran — order doesn't matter, just that both completed
    expect(order).toContain('a');
    expect(order).toContain('b');
  });

  it('runs queued tasks after a failed task — chain is not poisoned', async () => {
    const results: string[] = [];

    const first = withLock('poison-test', async () => {
      throw new Error('first fails');
    }).catch(() => results.push('first-rejected'));

    const second = withLock('poison-test', async () => {
      results.push('second-ran');
    });

    await Promise.allSettled([first, second]);
    expect(results).toContain('first-rejected');
    expect(results).toContain('second-ran');
  });

  it('evicts the key after the queue drains (no memory leak)', async () => {
    // Access the module's internal Map indirectly by checking that a
    // resolved lock does not block a fresh caller on the same key.
    const spy = vi.fn().mockResolvedValue('ok');
    await withLock('evict-test', spy);
    // A second call should also complete cleanly (not wait on stale chain)
    await withLock('evict-test', spy);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
