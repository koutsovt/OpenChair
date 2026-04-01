import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
const mockValidateBooking = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb({ booking: { create: mockCreate } })
    ),
  },
}));

vi.mock('@/lib/booking-validation', () => ({
  validateBooking: (...args: unknown[]) => mockValidateBooking(...args),
}));

import { createBookingCore } from '@/server/services/booking-service';

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
