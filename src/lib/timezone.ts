import { TZDate } from '@date-fns/tz';
import { startOfDay, endOfDay, format } from 'date-fns';

/**
 * Bookings are stored as absolute UTC instants, but "today" / "this day's
 * bookings" is a salon-local concept. Most hosts run the server process in
 * UTC; this app's salons default to "Australia/Sydney" (UTC+10/+11). Reading
 * day boundaries with plain `startOfDay`/`endOfDay`/`.getDay()` resolves in
 * the SERVER's local timezone, not the salon's — so a booking made in the
 * salon's early morning can still be "yesterday" in UTC, landing it outside
 * the query range for the day staff are actually viewing (and outside the
 * conflict-check window for that day). This file centralizes the fix: read
 * or construct calendar days through the salon's timezone explicitly.
 *
 * Two distinct, easy-to-mix-up operations, both handled correctly here:
 *  - "What Y/M/D is `dateStr` (a plain calendar day, e.g. from a date
 *    picker) as a wall-clock day in the salon's timezone?" — must be built
 *    from the Y/M/D *components*, never by parsing the string as an instant
 *    first (parsing then re-zoning shifts the day for non-Sydney-like
 *    offsets — e.g. a negative-offset timezone would round-trip to the
 *    previous day).
 *  - "What salon-local Y/M/D does a given real instant (e.g. `Date.now()`)
 *    fall on?" — must wrap the existing instant/Date and read its zoned
 *    getters, never reconstruct from components.
 */

/** Returns "today" as a "YYYY-MM-DD" string, as observed in `timezone`. */
export function salonTodayStr(timezone: string): string {
  return format(new TZDate(Date.now(), timezone), 'yyyy-MM-dd');
}

/**
 * Returns the [start, end] UTC instants bounding a "YYYY-MM-DD" calendar day
 * as observed in the salon's timezone, plus that day's day-of-week
 * (0=Sunday..6=Saturday, matching StylistAvailability.dayOfWeek) in the same
 * timezone.
 */
export function salonDayBounds(
  dateStr: string,
  timezone: string
): { start: Date; end: Date; dayOfWeek: number; zonedDate: TZDate } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const zonedDate = new TZDate(year, month - 1, day, timezone);
  return {
    start: startOfDay(zonedDate),
    end: endOfDay(zonedDate),
    dayOfWeek: zonedDate.getDay(),
    zonedDate,
  };
}

/**
 * Wraps an existing instant so its Y/M/D/day-of-week getters resolve in the
 * salon's timezone instead of the server's. Use this before passing a
 * client-sent instant (e.g. `date.toISOString()`) into code that reads
 * calendar-day components from it — such as `getAvailableSlots`, which
 * anchors its availability window to `date.getFullYear()/getMonth()/getDate()`.
 */
export function toSalonZoned(instant: Date | string, timezone: string): TZDate {
  return new TZDate(new Date(instant), timezone);
}
