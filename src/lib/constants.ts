import { bookingStatusStyle } from '@/lib/booking-status-styles';
import type { BookingStatus } from '@/types';

const STATUSES: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

/**
 * @deprecated Import from `@/lib/booking-status-styles` directly.
 * Kept for backward compat — maps status → badge class string.
 */
export const BOOKING_STATUS_COLORS: Record<string, string> = Object.fromEntries(
  STATUSES.map((s) => [s, bookingStatusStyle(s).badge])
);

/**
 * @deprecated Import from `@/lib/booking-status-styles` directly.
 * Kept for backward compat — maps status → human label.
 */
export const BOOKING_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUSES.map((s) => [s, bookingStatusStyle(s).label])
);

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const DEFAULT_SLOT_INTERVAL = 30; // minutes
