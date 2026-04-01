import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findConflictingBooking, validateBooking } from '../booking-validation';

const mockFindFirst = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
  },
}));

beforeEach(() => {
  mockFindFirst.mockReset();
});

describe('validateBooking', () => {
  it('rejects end time before start time', async () => {
    const start = new Date('2026-04-01T10:00:00Z');
    const end = new Date('2026-04-01T09:00:00Z');
    const result = await validateBooking('stylist1', start, end);
    expect(result).toBe('End time must be after start time');
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('rejects equal start and end time', async () => {
    const t = new Date('2026-04-01T10:00:00Z');
    const result = await validateBooking('stylist1', t, t);
    expect(result).toBe('End time must be after start time');
  });

  it('returns null when no conflict exists', async () => {
    mockFindFirst.mockResolvedValue(null);
    const start = new Date('2026-04-01T10:00:00Z');
    const end = new Date('2026-04-01T11:00:00Z');
    const result = await validateBooking('stylist1', start, end);
    expect(result).toBeNull();
  });

  it('returns conflict message when booking overlaps', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-booking' });
    const start = new Date('2026-04-01T10:00:00Z');
    const end = new Date('2026-04-01T11:00:00Z');
    const result = await validateBooking('stylist1', start, end);
    expect(result).toBe('This time slot conflicts with an existing booking');
  });
});

describe('findConflictingBooking', () => {
  it('uses default prisma when no tx provided', async () => {
    mockFindFirst.mockResolvedValue(null);
    await findConflictingBooking(
      'stylist1',
      new Date('2026-04-01T10:00:00Z'),
      new Date('2026-04-01T11:00:00Z')
    );
    expect(mockFindFirst).toHaveBeenCalledOnce();
  });

  it('uses tx when provided', async () => {
    const txFindFirst = vi.fn().mockResolvedValue(null);
    const tx = { booking: { findFirst: txFindFirst } };
    await findConflictingBooking(
      'stylist1',
      new Date('2026-04-01T10:00:00Z'),
      new Date('2026-04-01T11:00:00Z'),
      undefined,
      tx as never
    );
    expect(txFindFirst).toHaveBeenCalledOnce();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('excludes booking by id when provided', async () => {
    mockFindFirst.mockResolvedValue(null);
    await findConflictingBooking(
      'stylist1',
      new Date('2026-04-01T10:00:00Z'),
      new Date('2026-04-01T11:00:00Z'),
      'exclude-id'
    );
    const where = mockFindFirst.mock.calls[0][0].where;
    expect(where.id).toEqual({ not: 'exclude-id' });
  });

  it('does not filter by id when excludeBookingId is undefined', async () => {
    mockFindFirst.mockResolvedValue(null);
    await findConflictingBooking(
      'stylist1',
      new Date('2026-04-01T10:00:00Z'),
      new Date('2026-04-01T11:00:00Z')
    );
    const where = mockFindFirst.mock.calls[0][0].where;
    expect(where.id).toBeUndefined();
  });

  it('queries correct overlap formula', async () => {
    mockFindFirst.mockResolvedValue(null);
    const start = new Date('2026-04-01T10:00:00Z');
    const end = new Date('2026-04-01T11:00:00Z');
    await findConflictingBooking('s1', start, end);
    const where = mockFindFirst.mock.calls[0][0].where;
    expect(where.stylistId).toBe('s1');
    expect(where.startTime).toEqual({ lt: end });
    expect(where.endTime).toEqual({ gt: start });
    expect(where.status).toEqual({ in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'] });
  });
});
