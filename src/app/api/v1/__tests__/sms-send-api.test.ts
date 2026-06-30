import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockAuthenticate = vi.fn();
const mockSendSMS = vi.fn();
const mockLogSms = vi.fn();
const mockBookingFindFirst = vi.fn();
const mockClientFindFirst = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  authenticateSalonByApiKey: (...args: unknown[]) => mockAuthenticate(...args),
}));

vi.mock('@/lib/twilio', () => ({
  sendSMS: (...args: unknown[]) => mockSendSMS(...args),
  logSms: (...args: unknown[]) => mockLogSms(...args),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findFirst: (...args: unknown[]) => mockBookingFindFirst(...args) },
    client: { findFirst: (...args: unknown[]) => mockClientFindFirst(...args) },
  },
}));

import { POST } from '@/app/api/v1/sms/send/route';

function makeSendRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/v1/sms/send', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      authorization: 'Bearer test-key',
    },
  });
}

describe('POST /api/v1/sms/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ id: 'salon-A' });
    mockSendSMS.mockResolvedValue({ success: true, sid: 'SM123' });
    mockLogSms.mockResolvedValue(undefined);
  });

  it('sends and logs an SMS with no booking/client ids', async () => {
    const res = await POST(makeSendRequest({ phone: '+15551234567', body: 'Hi' }));

    expect(res.status).toBe(200);
    expect(mockLogSms).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+15551234567', salonId: 'salon-A' })
    );
  });

  it('returns 404 and writes no SmsLog for a booking from another salon', async () => {
    mockBookingFindFirst.mockResolvedValue(null);

    const res = await POST(
      makeSendRequest({ phone: '+15551234567', body: 'Hi', bookingId: 'booking-B' })
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Booking not found' });
    expect(mockBookingFindFirst).toHaveBeenCalledWith({
      where: { id: 'booking-B', salonId: 'salon-A' },
      select: { id: true },
    });
    expect(mockSendSMS).not.toHaveBeenCalled();
    expect(mockLogSms).not.toHaveBeenCalled();
  });

  it('returns 404 and writes no SmsLog for a client from another salon', async () => {
    mockClientFindFirst.mockResolvedValue(null);

    const res = await POST(
      makeSendRequest({ phone: '+15551234567', body: 'Hi', clientId: 'client-B' })
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Client not found' });
    expect(mockClientFindFirst).toHaveBeenCalledWith({
      where: { id: 'client-B', salonId: 'salon-A' },
      select: { id: true },
    });
    expect(mockSendSMS).not.toHaveBeenCalled();
    expect(mockLogSms).not.toHaveBeenCalled();
  });

  it('sends and logs when booking and client belong to the salon', async () => {
    mockBookingFindFirst.mockResolvedValue({ id: 'booking-A' });
    mockClientFindFirst.mockResolvedValue({ id: 'client-A' });

    const res = await POST(
      makeSendRequest({
        phone: '+15551234567',
        body: 'Hi',
        bookingId: 'booking-A',
        clientId: 'client-A',
      })
    );

    expect(res.status).toBe(200);
    expect(mockLogSms).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'booking-A',
        clientId: 'client-A',
        salonId: 'salon-A',
      })
    );
  });

  it('returns 401 when authentication fails', async () => {
    mockAuthenticate.mockResolvedValue(null);

    const res = await POST(makeSendRequest({ phone: '+15551234567', body: 'Hi' }));

    expect(res.status).toBe(401);
    expect(mockSendSMS).not.toHaveBeenCalled();
  });
});
