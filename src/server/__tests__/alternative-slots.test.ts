/**
 * getAlternativeSlots — tested with the vi.hoisted + inline mock pattern.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

// ── Hoist fakes ──────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const fn = () => vi.fn();
  function makeModel() {
    return { findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn() };
  }
  return {
    prisma: {
      salon: makeModel(),
      service: makeModel(),
      stylist: makeModel(),
      booking: makeModel(),
    },
    getAvailableSlots: fn(),
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/slots', () => ({ getAvailableSlots: mocks.getAvailableSlots }));
vi.mock('@/lib/locks', () => ({ withLock: vi.fn((_k: string, fn: () => unknown) => fn()) }));
vi.mock('@/lib/twilio', () => ({ sendSMS: vi.fn(), logSms: vi.fn() }));
vi.mock('@/lib/sms-templates', () => ({ bookingConfirmationMessage: vi.fn() }));
vi.mock('@/server/services/booking-service', () => ({ createBookingCore: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getAlternativeSlots } from '@/server/actions/public-booking';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const salon = { id: 'salon-1', timezone: 'UTC' };
const service = { id: 'svc-1', duration: 60 };
const stylistA = {
  id: 'sty-a',
  name: 'Alice',
  availability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true }],
  services: [{ durationOverride: null, serviceId: 'svc-1' }],
};
const stylistB = {
  id: 'sty-b',
  name: 'Bob',
  availability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true }],
  services: [{ durationOverride: null, serviceId: 'svc-1' }],
};

// Monday 2026-06-15 10:00 UTC
const requestedTime = new Date('2026-06-15T10:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.salon.findUnique.mockResolvedValue(salon);
  mocks.prisma.service.findFirst.mockResolvedValue(service);
  mocks.prisma.booking.findMany.mockResolvedValue([]);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getAlternativeSlots', () => {
  it('returns same-stylist alternatives when others are unavailable', async () => {
    mocks.prisma.stylist.findMany.mockResolvedValue([stylistA]);
    // getAvailableSlots returns one slot at 11:00
    mocks.getAvailableSlots.mockReturnValue([
      { start: new Date('2026-06-15T11:00:00Z'), end: new Date('2026-06-15T12:00:00Z') },
    ]);

    const results = await getAlternativeSlots('luxe', 'sty-a', 'svc-1', requestedTime, 5);

    expect(results).toHaveLength(1);
    expect(results[0].stylistId).toBe('sty-a');
    expect(results[0].stylistName).toBe('Alice');
  });

  it('returns cross-stylist alternatives sorted by proximity to requestedTime', async () => {
    mocks.prisma.stylist.findMany.mockResolvedValue([stylistA, stylistB]);
    // Alice has 14:00, Bob has 11:00 — Bob is closer to 10:00
    mocks.getAvailableSlots
      .mockReturnValueOnce([
        { start: new Date('2026-06-15T14:00:00Z'), end: new Date('2026-06-15T15:00:00Z') },
      ]) // Alice day0
      .mockReturnValueOnce([
        { start: new Date('2026-06-15T11:00:00Z'), end: new Date('2026-06-15T12:00:00Z') },
      ]) // Bob day0
      .mockReturnValue([]); // subsequent days

    const results = await getAlternativeSlots('luxe', 'sty-a', 'svc-1', requestedTime, 5);

    expect(results.length).toBeGreaterThanOrEqual(2);
    // Bob 11:00 is 1h from 10:00; Alice 14:00 is 4h from 10:00 — Bob should come first
    expect(results[0].stylistName).toBe('Bob');
    expect(results[1].stylistName).toBe('Alice');
  });

  it('excludes stylists who do not offer the requested service', async () => {
    // findMany already filters by services.some(serviceId) in the query — return empty
    mocks.prisma.stylist.findMany.mockResolvedValue([]);

    const results = await getAlternativeSlots('luxe', 'sty-a', 'svc-1', requestedTime, 5);

    expect(results).toHaveLength(0);
  });

  it('honours the limit parameter', async () => {
    mocks.prisma.stylist.findMany.mockResolvedValue([stylistA, stylistB]);
    // Each stylist returns 3 slots across multiple days
    const manySlots = [9, 10, 11].map((h) => ({
      start: new Date(`2026-06-15T${String(h).padStart(2, '0')}:00:00Z`),
      end: new Date(`2026-06-15T${String(h + 1).padStart(2, '0')}:00:00Z`),
    }));
    mocks.getAvailableSlots.mockReturnValue(manySlots);

    const results = await getAlternativeSlots('luxe', 'sty-a', 'svc-1', requestedTime, 3);

    expect(results).toHaveLength(3);
  });

  it('returns empty array when no slots exist in the search window', async () => {
    mocks.prisma.stylist.findMany.mockResolvedValue([stylistA]);
    mocks.getAvailableSlots.mockReturnValue([]);

    const results = await getAlternativeSlots('luxe', 'sty-a', 'svc-1', requestedTime, 5);

    expect(results).toHaveLength(0);
  });

  it('returns empty array when salon is not found', async () => {
    mocks.prisma.salon.findUnique.mockResolvedValue(null);

    const results = await getAlternativeSlots('no-such-salon', 'sty-a', 'svc-1', requestedTime, 5);

    expect(results).toHaveLength(0);
  });
});
