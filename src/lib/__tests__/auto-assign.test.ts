import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockServiceFindFirst = vi.fn();
const mockStylistServiceFindMany = vi.fn();
const mockBookingFindMany = vi.fn();
const mockFindConflicting = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    service: { findFirst: (...args: unknown[]) => mockServiceFindFirst(...args) },
    stylistService: { findMany: (...args: unknown[]) => mockStylistServiceFindMany(...args) },
    booking: { findMany: (...args: unknown[]) => mockBookingFindMany(...args) },
  },
}));

vi.mock('@/lib/booking-validation', () => ({
  findConflictingBooking: (...args: unknown[]) => mockFindConflicting(...args),
}));

import { autoAssignStylist } from '@/lib/scheduling/auto-assign';

const defaultService = { id: 'svc-1', salonId: 'salon-1', duration: 60 };

const makeStylistService = (
  id: string,
  name: string,
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>
) => ({
  stylist: { id, name, isActive: true, availability },
});

function localDate(hours: number, minutes = 0): Date {
  return new Date(2026, 3, 1, hours, minutes, 0, 0);
}

const wednesday10am = localDate(10);

beforeEach(() => {
  mockServiceFindFirst.mockReset();
  mockStylistServiceFindMany.mockReset();
  mockBookingFindMany.mockReset();
  mockFindConflicting.mockReset();

  mockServiceFindFirst.mockResolvedValue(defaultService);
});

describe('autoAssignStylist', () => {
  it('returns null when service not found', async () => {
    mockServiceFindFirst.mockResolvedValue(null);

    const result = await autoAssignStylist('salon-1', 'svc-missing', wednesday10am);

    expect(result).toBeNull();
    expect(mockStylistServiceFindMany).not.toHaveBeenCalled();
  });

  it('returns null when no stylists offer the service', async () => {
    mockStylistServiceFindMany.mockResolvedValue([]);

    const result = await autoAssignStylist('salon-1', 'svc-1', wednesday10am);

    expect(result).toBeNull();
  });

  it('returns null when all stylists have conflicts', async () => {
    mockStylistServiceFindMany.mockResolvedValue([
      makeStylistService('s1', 'Alice', [
        { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isActive: true },
      ]),
      makeStylistService('s2', 'Bob', [
        { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isActive: true },
      ]),
    ]);
    mockBookingFindMany.mockResolvedValue([]);
    mockFindConflicting.mockResolvedValue({ id: 'conflict-1' });

    const result = await autoAssignStylist('salon-1', 'svc-1', wednesday10am);

    expect(result).toBeNull();
  });

  it('returns null when no stylist has matching availability window', async () => {
    mockStylistServiceFindMany.mockResolvedValue([
      makeStylistService('s1', 'Alice', []),
      makeStylistService('s2', 'Bob', [
        { dayOfWeek: 3, startTime: '14:00', endTime: '18:00', isActive: true },
      ]),
    ]);
    mockBookingFindMany.mockResolvedValue([]);
    mockFindConflicting.mockResolvedValue(null);

    const result = await autoAssignStylist('salon-1', 'svc-1', wednesday10am);

    expect(result).toBeNull();
  });

  it('assigns stylist with highest score', async () => {
    const stylistA = makeStylistService('sA', 'Alice', [
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isActive: true },
    ]);
    const stylistB = makeStylistService('sB', 'Bob', [
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isActive: true },
    ]);
    mockStylistServiceFindMany.mockResolvedValue([stylistA, stylistB]);

    mockBookingFindMany.mockResolvedValue([
      { stylistId: 'sB', startTime: localDate(8), endTime: localDate(9) },
      { stylistId: 'sB', startTime: localDate(12), endTime: localDate(13) },
      { stylistId: 'sB', startTime: localDate(14), endTime: localDate(15) },
    ]);

    mockFindConflicting.mockResolvedValue(null);

    const result = await autoAssignStylist('salon-1', 'svc-1', wednesday10am);

    expect(result).not.toBeNull();
    expect(result!.stylistId).toBe('sA');
    expect(result!.stylistName).toBe('Alice');
    expect(result!.score).toBeGreaterThan(0);
  });

  it('prefers back-to-back bookings (gap minimization)', async () => {
    const stylistA = makeStylistService('sA', 'Alice', [
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isActive: true },
    ]);
    const stylistB = makeStylistService('sB', 'Bob', [
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isActive: true },
    ]);
    mockStylistServiceFindMany.mockResolvedValue([stylistA, stylistB]);

    mockBookingFindMany.mockResolvedValue([
      { stylistId: 'sA', startTime: localDate(9), endTime: localDate(10) },
      { stylistId: 'sB', startTime: localDate(9), endTime: localDate(9, 40) },
    ]);

    mockFindConflicting.mockResolvedValue(null);

    const result = await autoAssignStylist('salon-1', 'svc-1', wednesday10am);

    expect(result).not.toBeNull();
    expect(result!.stylistId).toBe('sA');
    expect(result!.reason).toContain('Back-to-back');
  });

  it('factors in client history', async () => {
    const stylistA = makeStylistService('sA', 'Alice', [
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isActive: true },
    ]);
    const stylistB = makeStylistService('sB', 'Bob', [
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', isActive: true },
    ]);
    mockStylistServiceFindMany.mockResolvedValue([stylistA, stylistB]);

    mockBookingFindMany
      .mockResolvedValueOnce([
        { stylistId: 'sA', startTime: localDate(8), endTime: localDate(9) },
        { stylistId: 'sB', startTime: localDate(8), endTime: localDate(9) },
      ])
      .mockResolvedValueOnce([{ stylistId: 'sA' }, { stylistId: 'sA' }, { stylistId: 'sA' }]);

    mockFindConflicting.mockResolvedValue(null);

    const result = await autoAssignStylist('salon-1', 'svc-1', wednesday10am, 'client-1');

    expect(result).not.toBeNull();
    expect(result!.stylistId).toBe('sA');
    expect(result!.reason).toContain('Client continuity');
  });

  it('skips stylists outside availability window', async () => {
    const earlyCloser = makeStylistService('s1', 'Alice', [
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },
    ]);
    const lateWorker = makeStylistService('s2', 'Bob', [
      { dayOfWeek: 3, startTime: '09:00', endTime: '20:00', isActive: true },
    ]);
    mockStylistServiceFindMany.mockResolvedValue([earlyCloser, lateWorker]);

    mockBookingFindMany.mockResolvedValue([]);
    mockFindConflicting.mockResolvedValue(null);

    const evening6pm = localDate(18);
    const result = await autoAssignStylist('salon-1', 'svc-1', evening6pm);

    expect(result).not.toBeNull();
    expect(result!.stylistId).toBe('s2');
    expect(result!.stylistName).toBe('Bob');
  });
});
