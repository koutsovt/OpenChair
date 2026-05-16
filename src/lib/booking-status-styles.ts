import type { BookingStatus } from '@/types';

/**
 * Returns Tailwind class strings for a booking status badge/pill.
 * Centralised here so every UI surface stays in sync.
 *
 * badge   — classes for a <Badge variant="secondary"> (bg + text)
 * block   — classes for timeline block bg+text (slightly richer, includes border)
 * label   — human-readable label
 */
export type BookingStatusStyle = {
  badge: string;
  block: string;
  label: string;
};

const STATUS_STYLES: Record<BookingStatus, BookingStatusStyle> = {
  PENDING: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    block: 'bg-amber-200 text-amber-900 border-amber-400',
    label: 'Pending',
  },
  CONFIRMED: {
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    block: 'bg-sky-200 text-sky-900 border-sky-400',
    label: 'Confirmed',
  },
  IN_PROGRESS: {
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    block: 'bg-violet-200 text-violet-900 border-violet-400',
    label: 'In Progress',
  },
  COMPLETED: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    block: 'bg-emerald-200 text-emerald-900 border-emerald-400',
    label: 'Completed',
  },
  CANCELLED: {
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    block: 'bg-rose-200 text-rose-900 border-rose-400',
    label: 'Cancelled',
  },
  NO_SHOW: {
    badge: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    block: 'bg-zinc-200 text-zinc-700 border-zinc-400',
    label: 'No Show',
  },
};

export function bookingStatusStyle(status: BookingStatus): BookingStatusStyle {
  return STATUS_STYLES[status];
}
