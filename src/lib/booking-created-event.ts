'use client';

/**
 * Broadcasts which stylist a booking just landed on, so any mounted timeline
 * view can scroll that stylist's column into view — regardless of which
 * entry point created the booking (the "+ New Booking" dialog, a tapped
 * timeline cell, or a rebook flow), since they all funnel through the same
 * `book()` call in booking-form.tsx.
 *
 * On mobile the timeline scrolls horizontally and only shows 1–2 stylist
 * columns at a time; without this, a booking created for a stylist whose
 * column is currently off-screen is invisible until the user manually
 * scrolls right, which looks identical to "the booking didn't save."
 *
 * A plain window CustomEvent (matching the pattern in useDemoMode.ts) is
 * enough here — BookingForm and BookingTimeline are siblings under a Server
 * Component page, so there's no shared client ancestor to lift state into
 * without a page-wide client wrapper refactor.
 */

const EVENT_NAME = 'openchair:booking-created';

interface BookingCreatedDetail {
  stylistId: string;
}

export function emitBookingCreated(stylistId: string): void {
  window.dispatchEvent(
    new CustomEvent<BookingCreatedDetail>(EVENT_NAME, { detail: { stylistId } })
  );
}

export function onBookingCreated(handler: (stylistId: string) => void): () => void {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<BookingCreatedDetail>).detail;
    if (detail?.stylistId) handler(detail.stylistId);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
