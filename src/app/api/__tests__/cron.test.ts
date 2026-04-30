import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockBookingFindMany = vi.fn();
const mockRecurringFindMany = vi.fn();
const mockBookingFindUnique = vi.fn();
const mockSendSMS = vi.fn();
const mockLogSms = vi.fn();
const mockProcessRecurring = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: (...args: unknown[]) => mockBookingFindMany(...args),
      findUnique: (...args: unknown[]) => mockBookingFindUnique(...args),
    },
    recurringBooking: {
      findMany: (...args: unknown[]) => mockRecurringFindMany(...args),
    },
  },
}));

vi.mock('@/lib/twilio', () => ({
  sendSMS: (...args: unknown[]) => mockSendSMS(...args),
  logSms: (...args: unknown[]) => mockLogSms(...args),
}));

vi.mock('@/lib/sms-templates', () => ({
  bookingReminderMessage: vi.fn(() => 'Reminder: appointment tomorrow'),
  recurringBookingMessage: vi.fn(() => 'Your recurring booking is confirmed'),
}));

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'test-secret',
  },
}));

vi.mock('@/lib/scheduling/recurring', () => ({
  processRecurringBooking: (...args: unknown[]) => mockProcessRecurring(...args),
}));

import { GET as remindersGET } from '@/app/api/cron/reminders/route';
import { GET as recurringGET } from '@/app/api/cron/recurring/route';

function makeRequest(path: string, token?: string): Request {
  return new Request(`http://localhost${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const mockBooking = {
  id: 'b-1',
  startTime: new Date(),
  salonId: 'salon-1',
  clientId: 'cli-1',
  client: { name: 'John', phone: '+1234567890' },
  guestPhone: null,
  guestName: null,
  stylist: { name: 'Jane' },
  service: { name: 'Haircut' },
  salon: { name: 'Test Salon' },
};

const mockRecurring = {
  id: 'rec-1',
  isActive: true,
  client: { id: 'cli-1', name: 'John', phone: '+1234567890' },
  service: { name: 'Haircut' },
  stylist: { name: 'Jane' },
  salon: { id: 'salon-1', name: 'Test Salon' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSendSMS.mockResolvedValue({ success: true, sid: 'SM123' });
  mockBookingFindMany.mockResolvedValue([]);
  mockRecurringFindMany.mockResolvedValue([]);
});

describe('Reminders endpoint', () => {
  it('returns 401 without auth', async () => {
    const req = makeRequest('/api/cron/reminders');
    const res = await remindersGET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 with wrong token', async () => {
    const req = makeRequest('/api/cron/reminders', 'wrong-token');
    const res = await remindersGET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it("sends reminders for tomorrow's bookings", async () => {
    const bookingWithGuestPhone = {
      ...mockBooking,
      id: 'b-2',
      clientId: null,
      client: null,
      guestPhone: '+0987654321',
      guestName: 'Guest',
    };

    mockBookingFindMany.mockResolvedValue([mockBooking, bookingWithGuestPhone]);

    const req = makeRequest('/api/cron/reminders', 'test-secret');
    const res = await remindersGET(req);

    expect(res.status).toBe(200);
    expect(mockSendSMS).toHaveBeenCalledTimes(2);
    expect(mockSendSMS).toHaveBeenCalledWith('+1234567890', 'Reminder: appointment tomorrow');
    expect(mockSendSMS).toHaveBeenCalledWith('+0987654321', 'Reminder: appointment tomorrow');
  });

  it('handles bookings with no phone', async () => {
    const noPhoneBooking = {
      ...mockBooking,
      id: 'b-3',
      clientId: null,
      client: null,
      guestPhone: null,
      guestName: null,
    };

    mockBookingFindMany.mockResolvedValue([noPhoneBooking]);

    const req = makeRequest('/api/cron/reminders', 'test-secret');
    const res = await remindersGET(req);

    expect(res.status).toBe(200);
    expect(mockSendSMS).not.toHaveBeenCalled();
  });

  it('returns processed count', async () => {
    mockBookingFindMany.mockResolvedValue([mockBooking]);

    const req = makeRequest('/api/cron/reminders', 'test-secret');
    const res = await remindersGET(req);

    const body = await res.json();
    expect(body.processed).toBe(1);
    expect(body.results).toHaveLength(1);
  });
});

describe('Recurring endpoint', () => {
  it('returns 401 without auth', async () => {
    const req = makeRequest('/api/cron/recurring');
    const res = await recurringGET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('processes recurring bookings', async () => {
    mockRecurringFindMany.mockResolvedValue([mockRecurring]);
    mockProcessRecurring.mockResolvedValue({ success: true, bookingId: 'b-new' });
    mockBookingFindUnique.mockResolvedValue({
      id: 'b-new',
      startTime: new Date(),
      salonId: 'salon-1',
    });

    const req = makeRequest('/api/cron/recurring', 'test-secret');
    const res = await recurringGET(req);

    expect(res.status).toBe(200);
    expect(mockProcessRecurring).toHaveBeenCalledWith('rec-1');
    expect(mockSendSMS).toHaveBeenCalledTimes(1);
    expect(mockSendSMS).toHaveBeenCalledWith('+1234567890', 'Your recurring booking is confirmed');
  });

  it('handles recurring with no client phone', async () => {
    const noPhoneRecurring = {
      ...mockRecurring,
      client: { id: 'cli-2', name: 'NoPhone', phone: null },
    };

    mockRecurringFindMany.mockResolvedValue([noPhoneRecurring]);
    mockProcessRecurring.mockResolvedValue({ success: true, bookingId: 'b-new' });

    const req = makeRequest('/api/cron/recurring', 'test-secret');
    const res = await recurringGET(req);

    expect(res.status).toBe(200);
    expect(mockSendSMS).not.toHaveBeenCalled();
  });

  it('returns processed count', async () => {
    mockRecurringFindMany.mockResolvedValue([mockRecurring]);
    mockProcessRecurring.mockResolvedValue({ success: true, bookingId: 'b-new' });
    mockBookingFindUnique.mockResolvedValue({
      id: 'b-new',
      startTime: new Date(),
      salonId: 'salon-1',
    });

    const req = makeRequest('/api/cron/recurring', 'test-secret');
    const res = await recurringGET(req);

    const body = await res.json();
    expect(body.processed).toBe(1);
    expect(body.results).toHaveLength(1);
  });
});
