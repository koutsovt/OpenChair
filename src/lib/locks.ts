/**
 * Per-key promise-chain mutex.
 *
 * Ported from King (github.com/KenKaiii/king) `atomicJson.ts#withJsonLock`.
 *
 * Two concurrent callers with the same `key` are serialized: the second
 * waits for the first to settle before running `fn`. Errors in `fn` are
 * re-thrown to the caller but do NOT poison the chain — the next queued
 * task still runs.
 *
 * Keys are evicted automatically once the queue drains to avoid memory
 * leaks in long-running server processes.
 */

const locks = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();

  const next = previous.then(() => fn());

  // Store a never-rejecting version so subsequent `.then` links in the chain
  // are not skipped when `fn` throws.
  const stored = next
    .catch(() => undefined)
    .finally(() => {
      // Evict the key once this is the tail of the chain (no one else queued
      // behind us). Another caller may have already replaced it — only delete
      // if the stored value is still ours.
      if (locks.get(key) === stored) {
        locks.delete(key);
      }
    });

  locks.set(key, stored);

  return next;
}
