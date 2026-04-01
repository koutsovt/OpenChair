import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSmsLogCreate = vi.fn();

vi.mock('@/lib/env', () => ({
  env: {
    TWILIO_ACCOUNT_SID: 'placeholder',
    TWILIO_AUTH_TOKEN: 'placeholder',
    TWILIO_PHONE_NUMBER: '+1234567890',
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    smsLog: { create: (...args: unknown[]) => mockSmsLogCreate(...args) },
  },
}));

vi.mock('twilio', () => {
  const validateRequest = vi.fn().mockReturnValue(true);
  const client = vi.fn(() => ({
    messages: { create: vi.fn().mockResolvedValue({ sid: 'SM_REAL_123' }) },
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).validateRequest = validateRequest;
  return { default: client };
});

import { sendSMS, validateTwilioSignature, logSms } from '../twilio';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendSMS (dev mode)', () => {
  it('returns success with dev-prefixed SID', async () => {
    const result = await sendSMS('+61400000001', 'Test message');
    expect(result.success).toBe(true);
    expect(result.sid).toMatch(/^dev_/);
  });

  it('does not return an error', async () => {
    const result = await sendSMS('+61400000001', 'Test');
    expect(result.error).toBeUndefined();
  });
});

describe('validateTwilioSignature (dev mode)', () => {
  it('returns true regardless of inputs', () => {
    expect(validateTwilioSignature('http://example.com', {}, '')).toBe(true);
    expect(validateTwilioSignature('', { foo: 'bar' }, 'bad-sig')).toBe(true);
  });
});

describe('logSms', () => {
  it('creates sms log record with all fields', async () => {
    mockSmsLogCreate.mockResolvedValue({ id: 'log-1' });

    await logSms({
      direction: 'OUTBOUND',
      phone: '+61400000001',
      body: 'Hello',
      status: 'sent',
      twilioSid: 'SM123',
      bookingId: 'booking-1',
      clientId: 'client-1',
      salonId: 'salon-1',
    });

    expect(mockSmsLogCreate).toHaveBeenCalledWith({
      data: {
        direction: 'OUTBOUND',
        phone: '+61400000001',
        body: 'Hello',
        status: 'sent',
        twilioSid: 'SM123',
        bookingId: 'booking-1',
        clientId: 'client-1',
        salonId: 'salon-1',
      },
    });
  });

  it('defaults optional fields to null', async () => {
    mockSmsLogCreate.mockResolvedValue({ id: 'log-2' });

    await logSms({
      direction: 'INBOUND',
      phone: '+61400000001',
      body: 'CANCEL',
      status: 'received',
      salonId: 'salon-1',
    });

    const data = mockSmsLogCreate.mock.calls[0][0].data;
    expect(data.twilioSid).toBeNull();
    expect(data.bookingId).toBeNull();
    expect(data.clientId).toBeNull();
  });

  it('returns the created record', async () => {
    const record = { id: 'log-3', direction: 'OUTBOUND' };
    mockSmsLogCreate.mockResolvedValue(record);

    const result = await logSms({
      direction: 'OUTBOUND',
      phone: '+61400000001',
      body: 'Test',
      status: 'sent',
      salonId: 'salon-1',
    });

    expect(result).toEqual(record);
  });
});
