import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockValidateBooking = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb({ booking: { create: mockCreate, update: mockUpdate } })
    ),
  },
}));

vi.mock('@/lib/booking-validation', () => ({
  validateBooking: (...args: unknown[]) => mockValidateBooking(...args),
}));

import { createBookingCore, rescheduleBookingCore } from '@/server/services/booking-service';

const baseParams = {
  stylistId: 'stylist-1',
  serviceId: 'service-1',
  salonId: 'salon-1',
  startTime: new Date('2026-04-01T10:00:00Z'),
  endTime: new Date('2026-04-01T11:00:00Z'),
  price: 50,
  clientId: 'client-1',
  notes: 'Test booking',
};

beforeEach(() => {
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockValidateBooking.mockReset();
});

describe('createBookingCore', () => {
  it('creates booking when no conflict', async () => {
    mockValidateBooking.mockResolvedValue(null);
    const fakeBooking = { id: 'booking-1', ...baseParams };
    mockCreate.mockResolvedValue(fakeBooking);

    const result = await createBookingCore(baseParams);

    expect(result).toEqual(fakeBooking);
    expect(mockValidateBooking).toHaveBeenCalledWith(
      baseParams.stylistId,
      baseParams.startTime,
      baseParams.endTime,
      undefined,
      expect.objectContaining({ booking: expect.anything() })
    );
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('throws error when conflict exists', async () => {
    mockValidateBooking.mockResolvedValue('This time slot conflicts with an existing booking');

    await expect(createBookingCore(baseParams)).rejects.toThrow(
      'This time slot conflicts with an existing booking'
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('throws error when end time before start time', async () => {
    mockValidateBooking.mockResolvedValue('End time must be after start time');

    await expect(
      createBookingCore({
        ...baseParams,
        startTime: new Date('2026-04-01T11:00:00Z'),
        endTime: new Date('2026-04-01T10:00:00Z'),
      })
    ).rejects.toThrow('End time must be after start time');
  });

  it('passes tx to validateBooking instead of default prisma', async () => {
    mockValidateBooking.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'b1' });

    await createBookingCore(baseParams);

    const txArg = mockValidateBooking.mock.calls[0][4];
    expect(txArg).toHaveProperty('booking');
    expect(txArg.booking).toHaveProperty('create');
  });

  it('passes all booking fields to tx.booking.create', async () => {
    mockValidateBooking.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'b1' });

    await createBookingCore({
      ...baseParams,
      guestName: 'Guest',
      guestPhone: '+1234567890',
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        startTime: baseParams.startTime,
        endTime: baseParams.endTime,
        price: baseParams.price,
        notes: baseParams.notes,
        clientId: baseParams.clientId,
        guestName: 'Guest',
        guestPhone: '+1234567890',
        serviceId: baseParams.serviceId,
        stylistId: baseParams.stylistId,
        salonId: baseParams.salonId,
      },
    });
  });

  it('defaults null fields when not provided', async () => {
    mockValidateBooking.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'b1' });

    await createBookingCore({
      stylistId: 's1',
      serviceId: 'sv1',
      salonId: 'sa1',
      startTime: new Date('2026-04-01T10:00:00Z'),
      endTime: new Date('2026-04-01T11:00:00Z'),
      price: 30,
    });

    const data = mockCreate.mock.calls[0][0].data;
    expect(data.notes).toBeNull();
    expect(data.clientId).toBeNull();
    expect(data.guestName).toBeNull();
    expect(data.guestPhone).toBeNull();
  });
});

describe('rescheduleBookingCore', () => {
  const rescheduleParams = {
    bookingId: 'booking-1',
    stylistId: 'stylist-1',
    startTime: new Date('2026-04-01T10:00:00Z'),
    endTime: new Date('2026-04-01T11:00:00Z'),
  };

  it('updates booking when no conflict', async () => {
    mockValidateBooking.mockResolvedValue(null);
    const fakeBooking = { id: 'booking-1', ...rescheduleParams };
    mockUpdate.mockResolvedValue(fakeBooking);

    const result = await rescheduleBookingCore(rescheduleParams);

    expect(result).toEqual(fakeBooking);
    // excludeBookingId (4th arg) must be the booking being moved, so it
    // never conflicts with its own pre-move row.
    expect(mockValidateBooking).toHaveBeenCalledWith(
      rescheduleParams.stylistId,
      rescheduleParams.startTime,
      rescheduleParams.endTime,
      rescheduleParams.bookingId,
      expect.objectContaining({ booking: expect.anything() })
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: rescheduleParams.bookingId },
      data: {
        startTime: rescheduleParams.startTime,
        endTime: rescheduleParams.endTime,
        stylistId: rescheduleParams.stylistId,
      },
      include: { stylist: true, service: true },
    });
  });

  it('throws error and never updates when conflict exists', async () => {
    mockValidateBooking.mockResolvedValue('This time slot conflicts with an existing booking');

    await expect(rescheduleBookingCore(rescheduleParams)).rejects.toThrow(
      'This time slot conflicts with an existing booking'
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('serializes two concurrent reschedules onto the same stylist+time so only one wins', async () => {
    // Simulates the exact race this function exists to prevent: two
    // reschedules targeting the same stylist and start time, racing each
    // other. Without the lock in withLock (keyed by stylistId+startTime),
    // both could read "no conflict" before either commits.
    let bookedSlot: string | null = null;
    mockValidateBooking.mockImplementation((stylistId: string, startTime: Date) => {
      const key = `${stylistId}:${startTime.toISOString()}`;
      return Promise.resolve(bookedSlot === key ? 'This time slot conflicts' : null);
    });
    mockUpdate.mockImplementation(({ data }: { data: { stylistId: string; startTime: Date } }) => {
      bookedSlot = `${data.stylistId}:${data.startTime.toISOString()}`;
      return Promise.resolve({ id: 'booking-x' });
    });

    const results = await Promise.allSettled([
      rescheduleBookingCore({ ...rescheduleParams, bookingId: 'booking-a' }),
      rescheduleBookingCore({ ...rescheduleParams, bookingId: 'booking-b' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});
