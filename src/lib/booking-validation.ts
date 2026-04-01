import { prisma, type PrismaTransactionClient } from '@/lib/prisma';

/**
 * Check if a stylist has any overlapping bookings in the given time range.
 * Uses the standard overlap formula: existing.start < newEnd AND existing.end > newStart
 */
export async function findConflictingBooking(
  stylistId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
  tx?: PrismaTransactionClient
) {
  const db = tx ?? prisma;
  return db.booking.findFirst({
    where: {
      stylistId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      status: { in: ['CONFIRMED', 'PENDING', 'IN_PROGRESS'] },
    },
  });
}

/**
 * Validate that a booking can be created without conflicts.
 * Returns null if valid, or an error message string.
 */
export async function validateBooking(
  stylistId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
  tx?: PrismaTransactionClient
): Promise<string | null> {
  if (endTime <= startTime) {
    return 'End time must be after start time';
  }

  const conflict = await findConflictingBooking(
    stylistId,
    startTime,
    endTime,
    excludeBookingId,
    tx
  );

  if (conflict) {
    return 'This time slot conflicts with an existing booking';
  }

  return null;
}
