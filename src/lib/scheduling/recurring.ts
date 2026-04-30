import { addMinutes, addWeeks, setDay, setHours, setMinutes, startOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { findConflictingBooking } from '@/lib/booking-validation';
import { createBookingCore } from '@/server/services/booking-service';

type ProcessResult =
  | { success: true; bookingId: string; adjustedTime: boolean }
  | { success: false; reason: string };

/**
 * Process a single recurring booking: create the next booking at the preferred
 * time, or fall back to nearby slots if unavailable.
 * Advances nextRunDate after successful creation.
 */
export async function processRecurringBooking(recurringId: string): Promise<ProcessResult> {
  const recurring = await prisma.recurringBooking.findUnique({
    where: { id: recurringId },
    include: { service: true, stylist: true, salon: true, client: true },
  });

  if (!recurring || !recurring.isActive) {
    return { success: false, reason: 'Recurring booking not found or inactive' };
  }

  const [hours, minutes] = recurring.preferredTime.split(':').map(Number);
  let targetDate = startOfDay(recurring.nextRunDate);
  targetDate = setDay(targetDate, recurring.dayOfWeek);
  targetDate = setHours(targetDate, hours);
  targetDate = setMinutes(targetDate, minutes);

  // If the target date is in the past, advance by intervalWeeks
  if (targetDate < new Date()) {
    targetDate = addWeeks(targetDate, recurring.intervalWeeks);
  }

  const endTime = addMinutes(targetDate, recurring.service.duration);

  // Try the preferred time first
  const conflict = await findConflictingBooking(recurring.stylistId, targetDate, endTime);

  if (!conflict) {
    return await createBookingAndAdvance(recurring, targetDate, endTime, false);
  }

  // Try offsets: ±30min, ±60min, ±90min, ±120min
  const offsets = [30, -30, 60, -60, 90, -90, 120, -120];
  for (const offset of offsets) {
    const altStart = addMinutes(targetDate, offset);
    const altEnd = addMinutes(altStart, recurring.service.duration);

    const altConflict = await findConflictingBooking(recurring.stylistId, altStart, altEnd);
    if (!altConflict) {
      return await createBookingAndAdvance(recurring, altStart, altEnd, true);
    }
  }

  // Try ±1 day, ±2 days at the same time
  for (const dayOffset of [1, -1, 2, -2]) {
    const altDate = addMinutes(
      setHours(setMinutes(startOfDay(addWeeks(recurring.nextRunDate, 0)), minutes), hours),
      dayOffset * 24 * 60
    );
    const altEnd = addMinutes(altDate, recurring.service.duration);

    if (altDate < new Date()) continue;

    const altConflict = await findConflictingBooking(recurring.stylistId, altDate, altEnd);
    if (!altConflict) {
      return await createBookingAndAdvance(recurring, altDate, altEnd, true);
    }
  }

  return { success: false, reason: 'No available slot within ±2 days of preferred time' };
}

async function createBookingAndAdvance(
  recurring: {
    id: string;
    intervalWeeks: number;
    nextRunDate: Date;
    service: { id: string; price: number; duration: number };
    stylistId: string;
    clientId: string;
    salonId: string;
  },
  startTime: Date,
  endTime: Date,
  adjustedTime: boolean
): Promise<ProcessResult> {
  try {
    const booking = await createBookingCore({
      stylistId: recurring.stylistId,
      serviceId: recurring.service.id,
      salonId: recurring.salonId,
      startTime,
      endTime,
      price: recurring.service.price,
      clientId: recurring.clientId,
    });

    // Advance nextRunDate
    const nextRun = addWeeks(recurring.nextRunDate, recurring.intervalWeeks);
    await prisma.recurringBooking.update({
      where: { id: recurring.id },
      data: { nextRunDate: nextRun },
    });

    return { success: true, bookingId: booking.id, adjustedTime };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Booking creation failed';
    return { success: false, reason: message };
  }
}
