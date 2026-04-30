import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addWeeks } from 'date-fns';
import { processRecurringBooking } from '../scheduling/recurring';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    recurringBooking: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/booking-validation', () => ({
  findConflictingBooking: vi.fn(),
}));

vi.mock('@/server/services/booking-service', () => ({
  createBookingCore: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { findConflictingBooking } from '@/lib/booking-validation';
import { createBookingCore } from '@/server/services/booking-service';

const mockPrisma = prisma as unknown as {
  recurringBooking: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};
const mockFindConflict = findConflictingBooking as ReturnType<typeof vi.fn>;
const mockCreateBookingCore = createBookingCore as ReturnType<typeof vi.fn>;

function makeRecurring(overrides = {}) {
  return {
    id: 'rec1',
    intervalWeeks: 6,
    dayOfWeek: 1,
    preferredTime: '10:00',
    isActive: true,
    nextRunDate: new Date('2026-04-06'), // a Monday
    clientId: 'client1',
    serviceId: 'svc1',
    stylistId: 'st1',
    salonId: 'salon1',
    service: { id: 'svc1', price: 8000, duration: 60 },
    stylist: { id: 'st1', name: 'Alice' },
    salon: { id: 'salon1', name: 'Test Salon' },
    client: { id: 'client1', name: 'Jane', phone: '0400000000' },
    ...overrides,
  };
}

describe('processRecurringBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns failure when recurring booking not found', async () => {
    mockPrisma.recurringBooking.findUnique.mockResolvedValue(null);
    const result = await processRecurringBooking('rec1');
    expect(result).toEqual({ success: false, reason: 'Recurring booking not found or inactive' });
  });

  it('returns failure when recurring booking is inactive', async () => {
    mockPrisma.recurringBooking.findUnique.mockResolvedValue(makeRecurring({ isActive: false }));
    const result = await processRecurringBooking('rec1');
    expect(result.success).toBe(false);
  });

  it('creates booking at preferred time when slot is free', async () => {
    mockPrisma.recurringBooking.findUnique.mockResolvedValue(makeRecurring());
    mockFindConflict.mockResolvedValue(null);
    mockCreateBookingCore.mockResolvedValue({ id: 'booking1' });
    mockPrisma.recurringBooking.update.mockResolvedValue({});

    const result = await processRecurringBooking('rec1');

    expect(result).toEqual({ success: true, bookingId: 'booking1', adjustedTime: false });

    // Verify createBookingCore was called with correct data
    expect(mockCreateBookingCore).toHaveBeenCalledWith(
      expect.objectContaining({
        stylistId: 'st1',
        serviceId: 'svc1',
        salonId: 'salon1',
        price: 8000,
        clientId: 'client1',
      })
    );
  });

  it('falls back to offset when preferred time has conflict', async () => {
    mockPrisma.recurringBooking.findUnique.mockResolvedValue(makeRecurring());
    // Preferred time conflicts, first offset (+30min) is free
    mockFindConflict.mockResolvedValueOnce({ id: 'conflict' }).mockResolvedValueOnce(null);
    mockCreateBookingCore.mockResolvedValue({ id: 'booking2' });
    mockPrisma.recurringBooking.update.mockResolvedValue({});

    const result = await processRecurringBooking('rec1');

    expect(result).toEqual({ success: true, bookingId: 'booking2', adjustedTime: true });
  });

  it('advances nextRunDate by exactly intervalWeeks', async () => {
    const recurring = makeRecurring();
    mockPrisma.recurringBooking.findUnique.mockResolvedValue(recurring);
    mockFindConflict.mockResolvedValue(null);
    mockCreateBookingCore.mockResolvedValue({ id: 'booking3' });
    mockPrisma.recurringBooking.update.mockResolvedValue({});

    await processRecurringBooking('rec1');

    const updateCall = mockPrisma.recurringBooking.update.mock.calls[0][0];
    const expected = addWeeks(recurring.nextRunDate, 6);
    expect(updateCall.data.nextRunDate.getTime()).toBe(expected.getTime());
  });

  it('returns failure when all time offsets and day offsets are exhausted', async () => {
    mockPrisma.recurringBooking.findUnique.mockResolvedValue(makeRecurring());
    // Every call conflicts
    mockFindConflict.mockResolvedValue({ id: 'conflict' });

    const result = await processRecurringBooking('rec1');

    expect(result).toEqual({
      success: false,
      reason: 'No available slot within ±2 days of preferred time',
    });
    // Should never have tried to create a booking
    expect(mockCreateBookingCore).not.toHaveBeenCalled();
  });

  it('tries offsets in correct order: ±30, ±60, ±90, ±120 then days', async () => {
    mockPrisma.recurringBooking.findUnique.mockResolvedValue(makeRecurring());
    // All conflict except the 5th attempt (should be -60min offset)
    mockFindConflict
      .mockResolvedValueOnce({ id: 'c1' }) // preferred
      .mockResolvedValueOnce({ id: 'c2' }) // +30
      .mockResolvedValueOnce({ id: 'c3' }) // -30
      .mockResolvedValueOnce({ id: 'c4' }) // +60
      .mockResolvedValueOnce(null); // -60 → success
    mockCreateBookingCore.mockResolvedValue({ id: 'booking4' });
    mockPrisma.recurringBooking.update.mockResolvedValue({});

    const result = await processRecurringBooking('rec1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.adjustedTime).toBe(true);
    }
    expect(mockFindConflict).toHaveBeenCalledTimes(5);
  });
});
