import { addMinutes, isBefore, isEqual } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import type { StylistAvailability, Booking, TimeSlot } from '@/types';
import { DEFAULT_SLOT_INTERVAL } from '@/lib/constants';

/**
 * Generate available time slots for a stylist on a given date.
 * Filters out slots that overlap with existing bookings.
 */
export function getAvailableSlots(
  date: Date,
  availability: StylistAvailability[],
  existingBookings: Pick<Booking, 'startTime' | 'endTime' | 'status'>[],
  serviceDuration: number,
  timezone: string,
  slotInterval: number = DEFAULT_SLOT_INTERVAL
): TimeSlot[] {
  const dayOfWeek = date.getDay();

  const daySlots = availability.filter((a) => a.dayOfWeek === dayOfWeek && a.isActive);

  if (daySlots.length === 0) return [];

  const activeBookings = existingBookings.filter(
    (b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW'
  );

  const slots: TimeSlot[] = [];

  for (const avail of daySlots) {
    const [startH, startM] = avail.startTime.split(':').map(Number);
    const [endH, endM] = avail.endTime.split(':').map(Number);
    const windowStart = new TZDate(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      startH,
      startM,
      0,
      timezone
    );
    const windowEnd = new TZDate(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      endH,
      endM,
      0,
      timezone
    );

    let cursor = windowStart;

    while (
      isBefore(addMinutes(cursor, serviceDuration), windowEnd) ||
      isEqual(addMinutes(cursor, serviceDuration), windowEnd)
    ) {
      const slotEnd = addMinutes(cursor, serviceDuration);

      const hasConflict = activeBookings.some((b) => b.startTime < slotEnd && b.endTime > cursor);

      if (!hasConflict) {
        slots.push({ start: new Date(cursor), end: new Date(slotEnd) });
      }

      cursor = addMinutes(cursor, slotInterval);
    }
  }

  return slots;
}
