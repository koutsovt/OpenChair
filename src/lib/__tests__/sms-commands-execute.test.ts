import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClientFindFirst = vi.fn();
const mockClientUpdate = vi.fn();
const mockBookingFindFirst = vi.fn();
const mockBookingUpdate = vi.fn();
const mockWaitlistFindFirst = vi.fn();
const mockWaitlistUpdate = vi.fn();
const mockSalonFindUnique = vi.fn();
const mockSendSMS = vi.fn();
const mockLogSms = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: {
      findFirst: (...args: unknown[]) => mockClientFindFirst(...args),
      update: (...args: unknown[]) => mockClientUpdate(...args),
    },
    booking: {
      findFirst: (...args: unknown[]) => mockBookingFindFirst(...args),
      update: (...args: unknown[]) => mockBookingUpdate(...args),
    },
    waitlistEntry: {
      findFirst: (...args: unknown[]) => mockWaitlistFindFirst(...args),
      update: (...args: unknown[]) => mockWaitlistUpdate(...args),
    },
    salon: {
      findUnique: (...args: unknown[]) => mockSalonFindUnique(...args),
    },
  },
}));

vi.mock('@/lib/twilio', () => ({
  sendSMS: (...args: unknown[]) => mockSendSMS(...args),
  logSms: (...args: unknown[]) => mockLogSms(...args),
}));

vi.mock('@/lib/sms-templates', () => ({
  bookingCancellationMessage: vi.fn().mockReturnValue('Your booking has been cancelled.'),
}));

const mockCreateBookingCore = vi.fn();
vi.mock('@/server/services/booking-service', () => ({
  createBookingCore: (...args: unknown[]) => mockCreateBookingCore(...args),
}));

import { executeCommand } from '../sms-commands';

const PHONE = '+61400000001';
const SALON_ID = 'salon-1';
const CLIENT = { id: 'client-1', name: 'Alice', phone: PHONE, salonId: SALON_ID };

beforeEach(() => {
  vi.clearAllMocks();
  mockSendSMS.mockResolvedValue({ success: true, sid: 'SM123' });
  mockLogSms.mockResolvedValue({});
  mockCreateBookingCore.mockResolvedValue({ id: 'booking-1' });
});

describe('executeCommand', () => {
  it('returns not found when client does not exist', async () => {
    mockClientFindFirst.mockResolvedValue(null);

    const result = await executeCommand(PHONE, 'CANCEL', SALON_ID, 'CANCEL');

    expect(result).toBe("We couldn't find an account with this phone number.");
  });

  describe('CANCEL', () => {
    it('cancels next upcoming booking', async () => {
      mockClientFindFirst.mockResolvedValue(CLIENT);
      const booking = {
        id: 'booking-1',
        startTime: new Date('2026-04-05T10:00:00Z'),
        salon: { name: 'Luxe Salon' },
        service: { name: 'Haircut' },
        stylist: { name: 'Maria' },
        client: { name: 'Alice' },
      };
      mockBookingFindFirst.mockResolvedValue(booking);
      mockBookingUpdate.mockResolvedValue({});

      const result = await executeCommand(PHONE, 'CANCEL', SALON_ID, 'CANCEL');

      expect(mockBookingUpdate).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancelReason: 'Cancelled via SMS',
        }),
      });
      expect(mockSendSMS).toHaveBeenCalledWith(PHONE, 'Your booking has been cancelled.');
      expect(result).toContain('has been cancelled');
    });

    it('returns no upcoming when none exist', async () => {
      mockClientFindFirst.mockResolvedValue(CLIENT);
      mockBookingFindFirst.mockResolvedValue(null);

      const result = await executeCommand(PHONE, 'CANCEL', SALON_ID, 'CANCEL');

      expect(result).toBe('You have no upcoming appointments to cancel.');
      expect(mockBookingUpdate).not.toHaveBeenCalled();
    });
  });

  describe('BOOK', () => {
    it('claims notified waitlist entry and creates booking', async () => {
      mockClientFindFirst.mockResolvedValue(CLIENT);
      mockWaitlistFindFirst.mockResolvedValue({
        id: 'wl-1',
        stylistId: 'stylist-1',
        serviceId: 'service-1',
        preferredDateStart: new Date('2026-05-01T10:00:00Z'),
        service: { id: 'service-1', duration: 60, price: 5000 },
      });
      mockWaitlistUpdate.mockResolvedValue({});

      const result = await executeCommand(PHONE, 'BOOK', SALON_ID, 'BOOK');

      expect(mockCreateBookingCore).toHaveBeenCalledWith(
        expect.objectContaining({
          stylistId: 'stylist-1',
          serviceId: 'service-1',
          salonId: SALON_ID,
          clientId: 'client-1',
        })
      );
      expect(mockWaitlistUpdate).toHaveBeenCalledWith({
        where: { id: 'wl-1' },
        data: { status: 'BOOKED' },
      });
      expect(result).toContain('spot has been booked');
    });

    it('returns no available slot when no notified entry', async () => {
      mockClientFindFirst.mockResolvedValue(CLIENT);
      mockWaitlistFindFirst.mockResolvedValue(null);

      const result = await executeCommand(PHONE, 'BOOK', SALON_ID, 'BOOK');

      expect(result).toContain('No available slot');
    });
  });

  describe('STOP', () => {
    it('opts out client from SMS', async () => {
      mockClientFindFirst.mockResolvedValue(CLIENT);
      mockClientUpdate.mockResolvedValue({});

      const result = await executeCommand(PHONE, 'STOP', SALON_ID, 'STOP');

      expect(mockClientUpdate).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: { smsOptOut: true },
      });
      expect(result).toContain('unsubscribed');
    });
  });

  describe('unknown command (forwarding)', () => {
    it('forwards message to salon owner', async () => {
      mockClientFindFirst.mockResolvedValue(CLIENT);
      mockSalonFindUnique.mockResolvedValue({
        id: SALON_ID,
        phone: '+61400999999',
        owner: { phone: '+61400888888', email: 'owner@test.com', firstName: 'Bob' },
      });

      const result = await executeCommand(PHONE, null, SALON_ID, 'Can I reschedule?');

      expect(mockSendSMS).toHaveBeenCalledWith(
        '+61400888888',
        expect.stringContaining('Can I reschedule?')
      );
      expect(mockSendSMS).toHaveBeenCalledWith('+61400888888', expect.stringContaining('Alice'));
      expect(result).toContain('salon has been notified');
    });

    it('falls back to salon phone when owner has no phone', async () => {
      mockClientFindFirst.mockResolvedValue(CLIENT);
      mockSalonFindUnique.mockResolvedValue({
        id: SALON_ID,
        phone: '+61400999999',
        owner: { phone: null, email: null, firstName: null },
      });

      const result = await executeCommand(PHONE, null, SALON_ID, 'hello');

      expect(mockSendSMS).toHaveBeenCalledWith('+61400999999', expect.any(String));
      expect(result).toContain('salon has been notified');
    });

    it('returns fallback when no phone available', async () => {
      mockClientFindFirst.mockResolvedValue(CLIENT);
      mockSalonFindUnique.mockResolvedValue({
        id: SALON_ID,
        phone: null,
        owner: { phone: null, email: null, firstName: null },
      });

      const result = await executeCommand(PHONE, null, SALON_ID, 'hello');

      expect(mockSendSMS).not.toHaveBeenCalled();
      expect(result).toContain('call the salon directly');
    });
  });
});
