import { describe, it, expect } from 'vitest';
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
