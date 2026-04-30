import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockValidateTwilioSignature = vi.fn();
const mockLogSms = vi.fn();
const mockParseCommand = vi.fn();
const mockExecuteCommand = vi.fn();
const mockClientFindFirst = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findFirst: (...args: unknown[]) => mockClientFindFirst(...args) },
  },
}));

vi.mock('@/lib/twilio', () => ({
  validateTwilioSignature: (...args: unknown[]) => mockValidateTwilioSignature(...args),
  logSms: (...args: unknown[]) => mockLogSms(...args),
}));

vi.mock('@/lib/sms-commands', () => ({
  parseCommand: (...args: unknown[]) => mockParseCommand(...args),
  executeCommand: (...args: unknown[]) => mockExecuteCommand(...args),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

import { POST } from '@/app/api/v1/sms/webhook/route';

function makeWebhookRequest(params: Record<string, string>, signature = 'valid-sig'): NextRequest {
  const body = new URLSearchParams(params);
  return new NextRequest('http://localhost/api/v1/sms/webhook', {
    method: 'POST',
    body: body.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-twilio-signature': signature,
    },
  });
}

const defaultParams = {
  From: '+15551234567',
  Body: 'STATUS',
  MessageSid: 'SM123',
};

describe('POST /api/v1/sms/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateTwilioSignature.mockReturnValue(true);
    mockClientFindFirst.mockResolvedValue({
      id: 'cli-1',
      salonId: 'salon-1',
      salon: { id: 'salon-1' },
    });
    mockParseCommand.mockReturnValue({ type: 'STATUS' });
    mockExecuteCommand.mockResolvedValue('Your next appointment is tomorrow at 10am');
    mockLogSms.mockResolvedValue(undefined);
  });

  it('returns TwiML response for valid webhook', async () => {
    const req = makeWebhookRequest(defaultParams);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/xml');

    const text = await res.text();
    expect(text).toContain('<Response>');
    expect(text).toContain('<Message>');
    expect(text).toContain('Your next appointment is tomorrow at 10am');
  });

  it('returns 403 for invalid signature', async () => {
    mockValidateTwilioSignature.mockReturnValue(false);

    const req = makeWebhookRequest(defaultParams, 'bad-sig');
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns error TwiML when client not found', async () => {
    mockClientFindFirst.mockResolvedValue(null);

    const req = makeWebhookRequest(defaultParams);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('couldn&apos;t find');
  });

  it('logs inbound SMS', async () => {
    const req = makeWebhookRequest(defaultParams);
    await POST(req);

    expect(mockLogSms).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'INBOUND',
        phone: '+15551234567',
        body: 'STATUS',
        twilioSid: 'SM123',
        clientId: 'cli-1',
        salonId: 'salon-1',
      })
    );
  });

  it('parses and executes command', async () => {
    const req = makeWebhookRequest(defaultParams);
    await POST(req);

    expect(mockParseCommand).toHaveBeenCalledWith('STATUS');
    expect(mockExecuteCommand).toHaveBeenCalledWith(
      '+15551234567',
      { type: 'STATUS' },
      'salon-1',
      'STATUS'
    );
  });

  it('escapes XML in response', async () => {
    mockExecuteCommand.mockResolvedValue('Use <bold> & "quotes"');

    const req = makeWebhookRequest(defaultParams);
    const res = await POST(req);
    const text = await res.text();

    expect(text).toContain('&lt;bold&gt;');
    expect(text).toContain('&amp;');
    expect(text).not.toContain('<bold>');
  });
});
