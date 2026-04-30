import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    TWILIO_ACCOUNT_SID: 'placeholder',
    TWILIO_AUTH_TOKEN: 'placeholder',
    TWILIO_PHONE_NUMBER: '+10000000000',
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { parseCommand } from '../sms-commands';

describe('parseCommand', () => {
  it('parses CANCEL command', () => {
    expect(parseCommand('CANCEL')).toBe('CANCEL');
  });

  it('parses cancel in lowercase', () => {
    expect(parseCommand('cancel')).toBe('CANCEL');
  });

  it('parses BOOK command', () => {
    expect(parseCommand('BOOK')).toBe('BOOK');
  });

  it('parses book with whitespace', () => {
    expect(parseCommand('  book  ')).toBe('BOOK');
  });

  it('parses STOP command', () => {
    expect(parseCommand('STOP')).toBe('STOP');
  });

  it('parses stop in mixed case', () => {
    expect(parseCommand('Stop')).toBe('STOP');
  });

  it('returns null for unknown text', () => {
    expect(parseCommand('hello')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCommand('')).toBeNull();
  });

  it('returns null for partial commands', () => {
    expect(parseCommand('CANCEL MY BOOKING')).toBeNull();
  });
});
