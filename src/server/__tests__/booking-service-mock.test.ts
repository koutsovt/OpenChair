/**
 * createBookingCore — tested with the vi.hoisted + mockPrisma() pattern.
 *
 * The fake Prisma client is hoisted so it's installed before any module
 * under test imports '@/lib/prisma'. This mirrors King's entityStore test
 * approach: mock the persistence layer, test business logic in isolation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

// ── Hoist fakes BEFORE any import of the module under test ──────────────────
// The factory must be self-contained (no imports) because vi.hoisted runs
// before module resolution. We inline a minimal model factory here; the
// full mockPrisma() helper in _mocks/prisma.ts is the canonical reference
// for tests that don't need vi.hoisted.
const mocks = vi.hoisted(() => {
  const fn = () => vi.fn();
  function makeModel() {
    return {
      findUnique: fn(),
      findFirst: fn(),
      findMany: fn(),
      create: fn(),
      update: fn(),
      upsert: fn(),
      delete: fn(),
      deleteMany: fn(),
      count: fn(),
    };
  }
  return {
    prisma: {
      booking: makeModel(),
      client: makeModel(),
      stylist: makeModel(),
      service: makeModel(),
      salon: makeModel(),
      $transaction: vi.fn(),
      $disconnect: vi.fn(),
    },
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}));

// validateBooking is tested separately; stub it to control conflict behaviour.
vi.mock('@/lib/booking-validation', () => ({
  validateBooking: vi.fn().mockResolvedValue(null), // null = no conflict
}));

// withLock passes through synchronously in tests (no real async queue needed).
vi.mock('@/lib/locks', () => ({
  withLock: vi.fn((_key: string, fn: () => unknown) => fn()),
}));

import { createBookingCore } from '@/server/services/booking-service';
import { validateBooking } from '@/lib/booking-validation';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseParams = {
  stylistId: 'sty-1',
  serviceId: 'svc-1',
  salonId: 'salon-1',
  startTime: new Date('2026-06-15T10:00:00Z'),
  endTime: new Date('2026-06-15T11:00:00Z'),
  price: 5000,
  clientId: 'client-1',
  notes: null,
};

const fakeBooking = {
  id: 'booking-1',
  ...baseParams,
  status: 'CONFIRMED',
  guestName: null,
  guestPhone: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createBookingCore (via mockPrisma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // $transaction: run fn with the same mock prisma instance
    mocks.prisma.$transaction.mockImplementation(
      (fn: (tx: typeof mocks.prisma) => Promise<unknown>) => fn(mocks.prisma)
    );
    // Default: validateBooking passes, booking.create succeeds
    vi.mocked(validateBooking).mockResolvedValue(null);
    mocks.prisma.booking.create.mockResolvedValue(fakeBooking);
  });

  it('creates a booking when there is no conflict', async () => {
    const result = await createBookingCore(baseParams);

    expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
    expect(mocks.prisma.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stylistId: 'sty-1',
        serviceId: 'svc-1',
        salonId: 'salon-1',
        price: 5000,
        clientId: 'client-1',
      }),
    });
    expect(result).toMatchObject({ id: 'booking-1', status: 'CONFIRMED' });
  });

  it('throws when validateBooking returns a conflict message', async () => {
    vi.mocked(validateBooking).mockResolvedValue('Time slot already booked');

    await expect(createBookingCore(baseParams)).rejects.toThrow('Time slot already booked');
    expect(mocks.prisma.booking.create).not.toHaveBeenCalled();
  });

  it('propagates unexpected prisma errors', async () => {
    mocks.prisma.booking.create.mockRejectedValue(new Error('DB connection lost'));

    await expect(createBookingCore(baseParams)).rejects.toThrow('DB connection lost');
  });

  it('passes guest details through when no clientId is provided', async () => {
    const guestParams = {
      ...baseParams,
      clientId: null,
      guestName: 'Sarah K.',
      guestPhone: '0400 999 111',
    };
    mocks.prisma.booking.create.mockResolvedValue({ ...fakeBooking, ...guestParams });

    await createBookingCore(guestParams);

    expect(mocks.prisma.booking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: null,
        guestName: 'Sarah K.',
        guestPhone: '0400 999 111',
      }),
    });
  });
});
