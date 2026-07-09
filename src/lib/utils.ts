import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Normalise a phone number to E.164 (e.g. "+61434399728") for Twilio.
 *
 * Twilio rejects local/spaced formats (error 21211), so every number handed to
 * the SMS layer must be E.164. Defaults to Australia (the salon's locale) when
 * no country code is present.
 *
 * Returns `null` when the input can't be confidently normalised, so callers can
 * skip the send rather than hand Twilio a bad number.
 */
export function toE164(phone: string, defaultCountry: 'AU' = 'AU'): string | null {
  const trimmed = phone.trim();

  // Already E.164 ("+" followed by 8–15 digits) — keep as-is.
  if (/^\+\d{8,15}$/.test(trimmed.replace(/[\s-]/g, ''))) {
    return trimmed.replace(/[\s-]/g, '');
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (defaultCountry === 'AU') {
    // 0434399728 -> +61434399728 (drop the trunk 0)
    if (digits.length === 10 && digits.startsWith('0')) {
      return `+61${digits.slice(1)}`;
    }
    // 61434399728 -> +61434399728 (country code, no plus)
    if (digits.length === 11 && digits.startsWith('61')) {
      return `+${digits}`;
    }
    // 434399728 -> +61434399728 (missing trunk 0)
    if (digits.length === 9 && digits.startsWith('4')) {
      return `+61${digits}`;
    }
  }

  return null;
}

/**
 * Given an E.164 AU number ("+61434399728"), return the local-format variants a
 * client record might be stored under ("0434399728" and "0434 399 728").
 *
 * Used by the inbound SMS webhook: Twilio delivers `From` in E.164, but older
 * client rows may hold the local format, so we look up both. Returns [] for
 * non-AU or non-E.164 input.
 */
export function auLocalFromE164(phone: string): string[] {
  const cleaned = phone.replace(/[\s-]/g, '');
  const match = /^\+61(\d{9})$/.exec(cleaned);
  if (!match) return [];
  const local = `0${match[1]}`;
  return [local, formatPhone(local)];
}
