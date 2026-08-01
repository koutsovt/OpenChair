import { describe, it, expect } from 'vitest';
import { salonDayBounds, salonTodayStr, toSalonZoned } from '../timezone';

describe('salonDayBounds', () => {
  it('computes UTC bounds for a Sydney calendar day (UTC+11 during DST)', () => {
    // Sydney is UTC+11 on 2026-04-01 (still in DST, which ends 5 Apr 2026).
    const { start, end, dayOfWeek } = salonDayBounds('2026-04-01', 'Australia/Sydney');

    // 2026-04-01 00:00 AEDT === 2026-03-31 13:00 UTC.
    expect(start.getTime()).toBe(new Date('2026-03-31T13:00:00.000Z').getTime());
    // 2026-04-01 23:59:59.999 AEDT === 2026-04-01 12:59:59.999 UTC.
    expect(end.getTime()).toBe(new Date('2026-04-01T12:59:59.999Z').getTime());
    // 2026-04-01 is a Wednesday.
    expect(dayOfWeek).toBe(3);
  });

  it('includes both a morning and afternoon Sydney booking for the same salon day (regression: stylist with multiple bookings)', () => {
    // Reproduces the reported bug: a stylist with two bookings on the same
    // Sydney calendar day appeared to have only one, because the
    // production server (Railway, no TZ set => UTC) computed day bounds in
    // UTC. A 09:30 Sydney booking falls on the *previous* UTC calendar day
    // and was silently excluded from that day's query.
    const { start, end } = salonDayBounds('2026-04-01', 'Australia/Sydney');
    const morningBooking = new Date('2026-03-31T22:30:00.000Z'); // 09:30 AEDT
    const afternoonBooking = new Date('2026-04-01T04:00:00.000Z'); // 15:00 AEDT

    expect(morningBooking.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(morningBooking.getTime()).toBeLessThanOrEqual(end.getTime());
    expect(afternoonBooking.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(afternoonBooking.getTime()).toBeLessThanOrEqual(end.getTime());
  });

  it('places a morning-Sydney booking instant inside its own day bounds, not the server-local one', () => {
    // 2026-04-01 09:00 AEDT (a typical opening-time booking) is
    // 2026-03-31 22:00 UTC — the previous UTC calendar day. A server
    // reading day boundaries in UTC/system-local time would exclude this
    // booking from a "2026-04-01" query, which is the exact bug this
    // module exists to prevent.
    const bookingInstant = new Date('2026-03-31T22:00:00.000Z');
    const { start, end } = salonDayBounds('2026-04-01', 'Australia/Sydney');

    expect(bookingInstant.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(bookingInstant.getTime()).toBeLessThanOrEqual(end.getTime());
  });
});

describe('toSalonZoned', () => {
  it('reads a UTC instant as its correct Sydney calendar day', () => {
    // 2026-03-31T22:00:00Z is 2026-04-01 09:00 AEDT — a different calendar
    // day than the UTC instant's own date.
    const zoned = toSalonZoned('2026-03-31T22:00:00.000Z', 'Australia/Sydney');

    expect(zoned.getFullYear()).toBe(2026);
    expect(zoned.getMonth()).toBe(3); // 0-indexed: April
    expect(zoned.getDate()).toBe(1);
    expect(zoned.getHours()).toBe(9);
  });
});

describe('salonTodayStr', () => {
  it('returns a YYYY-MM-DD string', () => {
    const today = salonTodayStr('Australia/Sydney');
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
