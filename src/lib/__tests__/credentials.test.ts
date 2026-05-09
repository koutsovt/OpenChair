import { describe, it, expect } from 'vitest';
import {
  jsonCodec,
  twilioCodec,
  loadTwilioCredentials,
  type TwilioCredentials,
} from '../credentials';

// ── Generic jsonCodec ────────────────────────────────────────────────────────

interface SampleCreds {
  apiKey: string;
  secret: string;
}

function validateSample(parsed: unknown): SampleCreds | null {
  if (parsed === null || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.apiKey !== 'string' || typeof p.secret !== 'string') return null;
  return { apiKey: p.apiKey, secret: p.secret };
}

const sampleCodec = jsonCodec<SampleCreds>(validateSample);

describe('jsonCodec', () => {
  it('round-trips a valid credential object', () => {
    const original: SampleCreds = { apiKey: 'key123', secret: 'secret456' };
    const encoded = sampleCodec.encode(original);
    const decoded = sampleCodec.decode(encoded);
    expect(decoded).toEqual(original);
  });

  it('returns null for invalid JSON string', () => {
    expect(sampleCodec.decode('not-json')).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    const encoded = JSON.stringify({ apiKey: 'key123' }); // missing `secret`
    expect(sampleCodec.decode(encoded)).toBeNull();
  });

  it('returns null when a field has the wrong type', () => {
    const encoded = JSON.stringify({ apiKey: 123, secret: 'secret' }); // apiKey is number
    expect(sampleCodec.decode(encoded)).toBeNull();
  });

  it('returns null for non-object JSON (array)', () => {
    expect(sampleCodec.decode('["a","b"]')).toBeNull();
  });

  it('returns null for null JSON', () => {
    expect(sampleCodec.decode('null')).toBeNull();
  });
});

// ── Twilio codec ─────────────────────────────────────────────────────────────

describe('twilioCodec', () => {
  const validCreds: TwilioCredentials = {
    accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    authToken: 'auth_token_here',
    fromNumber: '+15550001234',
  };

  it('round-trips valid Twilio credentials', () => {
    const encoded = twilioCodec.encode(validCreds);
    expect(twilioCodec.decode(encoded)).toEqual(validCreds);
  });

  it('returns null when accountSid is missing', () => {
    const encoded = JSON.stringify({ authToken: 'tok', fromNumber: '+1555' });
    expect(twilioCodec.decode(encoded)).toBeNull();
  });

  it('returns null when authToken is missing', () => {
    const encoded = JSON.stringify({ accountSid: 'AC123', fromNumber: '+1555' });
    expect(twilioCodec.decode(encoded)).toBeNull();
  });

  it('returns null when fromNumber is missing', () => {
    const encoded = JSON.stringify({ accountSid: 'AC123', authToken: 'tok' });
    expect(twilioCodec.decode(encoded)).toBeNull();
  });

  it('returns null when a field is an empty string', () => {
    const encoded = JSON.stringify({ ...validCreds, authToken: '' });
    expect(twilioCodec.decode(encoded)).toBeNull();
  });

  it('returns null when a field has wrong type (number)', () => {
    const encoded = JSON.stringify({ ...validCreds, accountSid: 42 });
    expect(twilioCodec.decode(encoded)).toBeNull();
  });
});

// ── loadTwilioCredentials ─────────────────────────────────────────────────────

describe('loadTwilioCredentials', () => {
  it('returns a typed credentials object for valid inputs', () => {
    const creds = loadTwilioCredentials('AC123', 'tok', '+1555');
    expect(creds).toEqual({ accountSid: 'AC123', authToken: 'tok', fromNumber: '+1555' });
  });

  it('throws a clear error when accountSid is blank', () => {
    expect(() => loadTwilioCredentials('', 'tok', '+1555')).toThrow(
      'Twilio credentials are invalid'
    );
  });

  it('throws a clear error when authToken is blank', () => {
    expect(() => loadTwilioCredentials('AC123', '', '+1555')).toThrow(
      'Twilio credentials are invalid'
    );
  });

  it('throws a clear error when fromNumber is blank', () => {
    expect(() => loadTwilioCredentials('AC123', 'tok', '')).toThrow(
      'Twilio credentials are invalid'
    );
  });
});
