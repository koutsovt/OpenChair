import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAuthenticatedSalon = vi.fn();
const mockServiceFindFirst = vi.fn();
const mockStylistFindFirst = vi.fn();
const mockClientFindFirst = vi.fn();
const mockClientCreate = vi.fn();
const mockBookingFindFirst = vi.fn();
const mockBookingUpdate = vi.fn();
const mockStylistFindMany = vi.fn();
const mockFindConflictingBooking = vi.fn();
const mockGetSuggestedSlots = vi.fn();
const mockCreateBookingCore = vi.fn();
const mockAutoAssignStylist = vi.fn();
const mockMatchWaitlist = vi.fn();
const mockNotifyWaitlist = vi.fn();
const mockSendSMS = vi.fn();
const mockLogSms = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock('@/server/auth', () => ({
  getAuthenticatedSalon: (...args: unknown[]) => mockGetAuthenticatedSalon(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    service: { findFirst: (...args: unknown[]) => mockServiceFindFirst(...args) },
    stylist: {
      findFirst: (...args: unknown[]) => mockStylistFindFirst(...args),
      findMany: (...args: unknown[]) => mockStylistFindMany(...args),
    },
    client: {
      findFirst: (...args: unknown[]) => mockClientFindFirst(...args),
      create: (...args: unknown[]) => mockClientCreate(...args),
    },
    booking: {
      findFirst: (...args: unknown[]) => mockBookingFindFirst(...args),
      update: (...args: unknown[]) => mockBookingUpdate(...args),
    },
  },
}));

vi.mock('@/server/services/booking-service', () => ({
  createBookingCore: (...args: unknown[]) => mockCreateBookingCore(...args),
}));

vi.mock('@/lib/scheduling/auto-assign', () => ({
  autoAssignStylist: (...args: unknown[]) => mockAutoAssignStylist(...args),
}));

vi.mock('@/lib/scheduling/waitlist', () => ({
  matchWaitlistEntries: (...args: unknown[]) => mockMatchWaitlist(...args),
  notifyWaitlistClient: (...args: unknown[]) => mockNotifyWaitlist(...args),
}));

vi.mock('@/lib/twilio', () => ({
  sendSMS: (...args: unknown[]) => mockSendSMS(...args),
  logSms: (...args: unknown[]) => mockLogSms(...args),
}));

vi.mock('@/lib/sms-templates', () => ({
  bookingConfirmationMessage: vi.fn(() => 'Confirmation SMS'),
  bookingRescheduledMessage: vi.fn(() => 'Rescheduled SMS'),
  rebookNudgeMessage: vi.fn(() => 'Rebook nudge SMS'),
}));

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_APP_URL: 'https://test.openchair.app' },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock('@/lib/booking-validation', () => ({
  validateBooking: vi.fn(),
  findConflictingBooking: (...args: unknown[]) => mockFindConflictingBooking(...args),
}));

vi.mock('@/lib/slots', () => ({
  getAvailableSlots: vi.fn(() => []),
}));

vi.mock('@/lib/scheduling/smart-suggestions', () => ({
  getSuggestedSlots: (...args: unknown[]) => mockGetSuggestedSlots(...args),
}));

import {
  createBooking,
  updateBookingStatus,
  getSlotAlternativesAction,
} from '@/server/actions/bookings';

const defaultSalon = { id: 'salon-1', name: 'Test Salon', timezone: 'UTC' };
const defaultService = {
  id: 'svc-1',
  salonId: 'salon-1',
  name: 'Haircut',
  duration: 60,
  price: 5000,
};
const defaultStylist = { id: 'sty-1', salonId: 'salon-1', name: 'Jane', isActive: true };

beforeEach(() => {
  mockGetAuthenticatedSalon.mockReset();
  mockServiceFindFirst.mockReset();
  mockStylistFindFirst.mockReset();
  mockClientFindFirst.mockReset();
  mockClientCreate.mockReset();
  mockBookingFindFirst.mockReset();
  mockBookingUpdate.mockReset();
  mockCreateBookingCore.mockReset();
  mockAutoAssignStylist.mockReset();
  mockMatchWaitlist.mockReset();
  mockNotifyWaitlist.mockReset();
  mockSendSMS.mockReset();
  mockLogSms.mockReset();
  mockRevalidatePath.mockReset();
  mockStylistFindMany.mockReset();
  mockFindConflictingBooking.mockReset();
  mockGetSuggestedSlots.mockReset();

  mockGetAuthenticatedSalon.mockResolvedValue(defaultSalon);
  mockSendSMS.mockResolvedValue({ success: true, sid: 'SM123' });
  mockGetSuggestedSlots.mockResolvedValue([]);
});

describe('createBooking', () => {
  const validData = {
    stylistId: 'sty-1',
    serviceId: 'svc-1',
    clientId: 'client-1',
    startTime: '2026-06-15T10:00:00.000Z',
  };

  it('creates booking with valid data', async () => {
    mockServiceFindFirst.mockResolvedValue(defaultService);
    mockStylistFindFirst.mockResolvedValue(defaultStylist);
    mockClientFindFirst.mockResolvedValue({ id: 'client-1', name: 'Alice', phone: '+1234567890' });
    mockCreateBookingCore.mockResolvedValue({ id: 'b1' });

    const result = await createBooking(validData);

    expect(result).toEqual({ success: true, bookingId: 'b1', stylistId: 'sty-1' });
    expect(mockServiceFindFirst).toHaveBeenCalledWith({
      where: { id: 'svc-1', salonId: 'salon-1' },
    });
    expect(mockStylistFindFirst).toHaveBeenCalledWith({
      where: { id: 'sty-1', salonId: 'salon-1', isActive: true },
    });
    expect(mockCreateBookingCore).toHaveBeenCalledWith(
      expect.objectContaining({
        stylistId: 'sty-1',
        serviceId: 'svc-1',
        salonId: 'salon-1',
        price: 5000,
        clientId: 'client-1',
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/bookings');
  });

  it('returns error for invalid schema', async () => {
    const result = await createBooking({
      stylistId: '',
      serviceId: 'svc-1',
      clientId: 'client-1',
      startTime: '2026-06-15T10:00:00.000Z',
    });

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(mockServiceFindFirst).not.toHaveBeenCalled();
  });

  it('returns error when service not found', async () => {
    mockServiceFindFirst.mockResolvedValue(null);

    const result = await createBooking(validData);

    expect(result).toEqual({ success: false, error: 'Service not found' });
    expect(mockStylistFindFirst).not.toHaveBeenCalled();
  });

  it('returns error when stylist not found', async () => {
    mockServiceFindFirst.mockResolvedValue(defaultService);
    mockStylistFindFirst.mockResolvedValue(null);

    const result = await createBooking(validData);

    expect(result).toEqual({ success: false, error: 'Stylist not found' });
    expect(mockCreateBookingCore).not.toHaveBeenCalled();
  });

  it('auto-assigns stylist when stylistId is "auto"', async () => {
    mockServiceFindFirst.mockResolvedValue(defaultService);
    mockAutoAssignStylist.mockResolvedValue({ stylistId: 'sty-1' });
    mockStylistFindFirst.mockResolvedValue(defaultStylist);
    mockClientFindFirst.mockResolvedValue({ id: 'client-1', name: 'Alice', phone: null });
    mockCreateBookingCore.mockResolvedValue({ id: 'b1' });

    const result = await createBooking({
      ...validData,
      stylistId: 'auto',
    });

    expect(result).toEqual({ success: true, bookingId: 'b1', stylistId: 'sty-1' });
    expect(mockAutoAssignStylist).toHaveBeenCalledWith(
      'salon-1',
      'svc-1',
      expect.any(Date),
      'client-1'
    );
    expect(mockStylistFindFirst).toHaveBeenCalledWith({
      where: { id: 'sty-1', salonId: 'salon-1', isActive: true },
    });
  });

  it('returns error when auto-assign finds no stylist', async () => {
    mockServiceFindFirst.mockResolvedValue(defaultService);
    mockAutoAssignStylist.mockResolvedValue(null);

    const result = await createBooking({
      ...validData,
      stylistId: 'auto',
    });

    expect(result).toEqual({ success: false, error: 'No available stylist for this time' });
    expect(mockStylistFindFirst).not.toHaveBeenCalled();
  });

  it('returns error when createBookingCore throws', async () => {
    mockServiceFindFirst.mockResolvedValue(defaultService);
    mockStylistFindFirst.mockResolvedValue(defaultStylist);
    mockClientFindFirst.mockResolvedValue({ id: 'client-1', name: 'Alice', phone: null });
    mockCreateBookingCore.mockRejectedValue(new Error('conflict'));

    const result = await createBooking(validData);

    expect(result).toEqual({ success: false, error: 'conflict' });
  });
});

describe('updateBookingStatus', () => {
  const bookingWithIncludes = {
    id: 'b1',
    salonId: 'salon-1',
    stylistId: 'sty-1',
    serviceId: 'svc-1',
    startTime: new Date('2026-06-15T10:00:00Z'),
    endTime: new Date('2026-06-15T11:00:00Z'),
    status: 'CONFIRMED',
    service: defaultService,
    stylist: defaultStylist,
  };

  it('updates booking status', async () => {
    mockBookingFindFirst.mockResolvedValue(bookingWithIncludes);
    mockBookingUpdate.mockResolvedValue({ ...bookingWithIncludes, status: 'COMPLETED' });

    const result = await updateBookingStatus('b1', 'COMPLETED');

    expect(result).toEqual({ success: true });
    expect(mockBookingFindFirst).toHaveBeenCalledWith({
      where: { id: 'b1', salonId: 'salon-1' },
      include: { service: true, stylist: true },
    });
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: {
        status: 'COMPLETED',
        cancelledAt: undefined,
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/bookings');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/bookings/b1');
  });

  it('returns error when booking not found', async () => {
    mockBookingFindFirst.mockResolvedValue(null);

    const result = await updateBookingStatus('b999', 'COMPLETED');

    expect(result).toEqual({ success: false, error: 'Booking not found' });
    expect(mockBookingUpdate).not.toHaveBeenCalled();
  });

  it('sets cancelledAt when status is CANCELLED', async () => {
    mockBookingFindFirst.mockResolvedValue(bookingWithIncludes);
    mockBookingUpdate.mockResolvedValue({ ...bookingWithIncludes, status: 'CANCELLED' });
    mockMatchWaitlist.mockResolvedValue([]);

    const result = await updateBookingStatus('b1', 'CANCELLED');

    expect(result).toEqual({ success: true });
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: {
        status: 'CANCELLED',
        cancelledAt: expect.any(Date),
      },
    });
  });

  const guestBooking = {
    ...bookingWithIncludes,
    clientId: null,
    guestName: 'Walk-in Wendy',
    guestPhone: '0412 000 111',
  };

  it('promotes a guest to a new client when their first visit completes', async () => {
    mockBookingFindFirst.mockResolvedValue(guestBooking);
    mockBookingUpdate.mockResolvedValue({ ...guestBooking, status: 'COMPLETED' });
    mockClientFindFirst.mockResolvedValue(null); // no existing client with that phone
    mockClientCreate.mockResolvedValue({ id: 'new-client-1' });

    const result = await updateBookingStatus('b1', 'COMPLETED');

    expect(result).toEqual({ success: true });
    expect(mockClientCreate).toHaveBeenCalledWith({
      data: { name: 'Walk-in Wendy', phone: '0412 000 111', source: 'guest', salonId: 'salon-1' },
      select: { id: true },
    });
    // Booking relinked to the new client and guest fields cleared
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { clientId: 'new-client-1', guestName: null, guestPhone: null },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/clients');
  });

  it('reuses an existing client with the same phone instead of duplicating', async () => {
    mockBookingFindFirst.mockResolvedValue(guestBooking);
    mockBookingUpdate.mockResolvedValue({ ...guestBooking, status: 'COMPLETED' });
    mockClientFindFirst.mockResolvedValue({ id: 'existing-client-1' });

    await updateBookingStatus('b1', 'COMPLETED');

    expect(mockClientCreate).not.toHaveBeenCalled();
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'b1' },
      data: { clientId: 'existing-client-1', guestName: null, guestPhone: null },
    });
  });

  it('does not promote when the completed booking already has a client', async () => {
    mockBookingFindFirst.mockResolvedValue({ ...bookingWithIncludes, clientId: 'c1' });
    mockBookingUpdate.mockResolvedValue({ ...bookingWithIncludes, status: 'COMPLETED' });

    await updateBookingStatus('b1', 'COMPLETED');

    expect(mockClientCreate).not.toHaveBeenCalled();
    expect(mockClientFindFirst).not.toHaveBeenCalled();
  });
});

describe('getSlotAlternativesAction', () => {
  const start = '2026-04-01T10:00:00.000Z';

  it('returns stylists free at the requested slot', async () => {
    mockServiceFindFirst.mockResolvedValue({ duration: 60 });
    mockStylistFindMany.mockResolvedValue([
      { id: 'st-1', name: 'Maria' },
      { id: 'st-2', name: 'Jo' },
    ]);
    // Maria busy, Jo free
    mockFindConflictingBooking.mockResolvedValueOnce({ id: 'b-busy' }).mockResolvedValueOnce(null);

    const result = await getSlotAlternativesAction('svc-1', start);

    expect(result.freeStylists).toEqual([{ id: 'st-2', name: 'Jo' }]);
    expect(result.nearbySlots).toEqual([]);
    expect(mockGetSuggestedSlots).not.toHaveBeenCalled();
  });

  it('falls back to nearest slots when nobody is free', async () => {
    mockServiceFindFirst.mockResolvedValue({ duration: 60 });
    mockStylistFindMany.mockResolvedValue([{ id: 'st-1', name: 'Maria' }]);
    mockFindConflictingBooking.mockResolvedValue({ id: 'b-busy' });
    mockGetSuggestedSlots.mockResolvedValue([
      {
        start: new Date('2026-04-01T13:00:00.000Z'),
        end: new Date('2026-04-01T14:00:00.000Z'),
        stylistId: 'st-1',
        stylistName: 'Maria',
        score: 1,
        reason: 'gap',
      },
      {
        start: new Date('2026-04-01T10:30:00.000Z'),
        end: new Date('2026-04-01T11:30:00.000Z'),
        stylistId: 'st-1',
        stylistName: 'Maria',
        score: 1,
        reason: 'gap',
      },
    ]);

    const result = await getSlotAlternativesAction('svc-1', start);

    expect(result.freeStylists).toEqual([]);
    // Closest to 10:00 (10:30) sorted before 13:00
    expect(result.nearbySlots[0].start).toBe('2026-04-01T10:30:00.000Z');
    expect(result.nearbySlots).toHaveLength(2);
  });

  it('returns empty when no stylist offers the service', async () => {
    mockServiceFindFirst.mockResolvedValue({ duration: 60 });
    mockStylistFindMany.mockResolvedValue([]);

    const result = await getSlotAlternativesAction('svc-1', start);

    expect(result).toEqual({ freeStylists: [], nearbySlots: [] });
  });
});
