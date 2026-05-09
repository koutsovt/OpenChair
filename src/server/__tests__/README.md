# Server Action Test Patterns

## Mock-layer pattern (preferred for new tests)

All server actions depend on `@/lib/prisma`. Instead of hitting a real database, use the **`vi.hoisted` + `mockPrisma()`** pattern so the fake is installed before any module under test imports it.

### Setup

```ts
import { vi } from 'vitest';
import { mockPrisma } from './_mocks/prisma';

// 1. Hoist the fake — runs before module resolution
const mocks = vi.hoisted(() => {
  const mp = mockPrisma();
  return { prisma: mp };
});

// 2. Replace the real Prisma client with the fake
vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}));

// 3. Import the unit under test AFTER vi.mock()
import { myServerAction } from '@/server/actions/my-action';
```

### In tests

```ts
beforeEach(() => {
  vi.clearAllMocks();
  // Wire up $transaction so it forwards to the same fake
  mocks.prisma.$transaction.mockImplementation((fn) => fn(mocks.prisma));
});

it('does something', async () => {
  mocks.prisma.booking.findFirst.mockResolvedValue({ id: 'b1', ... });
  const result = await myServerAction(...);
  expect(result).toEqual({ success: true });
});
```

### Why `vi.hoisted` — and why the factory must be self-contained

Vitest hoists `vi.mock(...)` calls to the top of the file, but the factory
callback runs at that hoisted position — before your top-level `const` variables
are initialised. `vi.hoisted(() => {...})` runs its callback at the same hoisted
position, so the returned object is available inside `vi.mock` factories.

Without this, the mock factory captures `undefined` and every method call throws.

**Important:** the `vi.hoisted` callback runs before module resolution, so you
cannot `import` helpers inside it. If you need model stubs, inline them directly
in the `vi.hoisted` callback (see `booking-service-mock.test.ts`). The
`_mocks/prisma.ts` helper can be imported normally in tests that don't use
`vi.hoisted` but still need a typed fake.

### What's in `_mocks/prisma.ts`

`mockPrisma()` returns a typed object with `vi.fn()` stubs for:

| Model                                                                                                                                         | Methods                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| booking, client, stylist, service, serviceCategory, salon, recurringBooking, waitlistEntry, smsLog, stylistService, stylistAvailability, user | findUnique, findFirst, findMany, create, update, upsert, delete, deleteMany, count, aggregate |
| (client-level)                                                                                                                                | $transaction, $connect, $disconnect                                                           |

### Reference implementation

See `booking-service-mock.test.ts` for a complete example using this pattern
to test `createBookingCore` in full isolation from the database.

---

## Legacy flat-mock pattern (existing tests)

The older tests (e.g. `bookings.test.ts`) use plain top-level `vi.fn()` variables
and inline `vi.mock(...)` factories. These are valid but verbose. New tests should
prefer the `mockPrisma()` helper above.
