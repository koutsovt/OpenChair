/**
 * Typed in-memory Prisma mock factory.
 *
 * Returns a `mockPrisma()` object whose methods are all `vi.fn()` stubs.
 * Use with `vi.hoisted` + `vi.mock('@/lib/prisma', ...)` so the fake is
 * installed before any module under test imports it.
 *
 * Pattern (ported from King entityStore.test.ts):
 *
 *   const mocks = vi.hoisted(() => {
 *     const mp = mockPrisma();
 *     return { prisma: mp };
 *   });
 *
 *   vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
 *
 * Then in each test:
 *   mocks.prisma.booking.findMany.mockResolvedValue([...]);
 */

import { vi } from 'vitest';

function makeModel() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };
}

export function mockPrisma() {
  return {
    booking: makeModel(),
    client: makeModel(),
    stylist: makeModel(),
    service: makeModel(),
    serviceCategory: makeModel(),
    salon: makeModel(),
    recurringBooking: makeModel(),
    waitlistEntry: makeModel(),
    smsLog: makeModel(),
    stylistService: makeModel(),
    stylistAvailability: makeModel(),
    user: makeModel(),
    // Prisma client-level methods
    $transaction: vi.fn(async <T>(fn: (tx: ReturnType<typeof mockPrisma>) => Promise<T>) =>
      fn(mockPrisma())
    ),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}

export type MockPrisma = ReturnType<typeof mockPrisma>;
