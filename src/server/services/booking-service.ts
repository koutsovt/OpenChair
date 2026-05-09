import { prisma } from '@/lib/prisma';
import { validateBooking } from '@/lib/booking-validation';
import { withLock } from '@/lib/locks';

interface CreateBookingParams {
  stylistId: string;
  serviceId: string;
  salonId: string;
  startTime: Date;
  endTime: Date;
  price: number;
  clientId?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  notes?: string | null;
}

/**
 * Atomically validate and create a booking inside a $transaction.
 * Prevents TOCTOU race conditions (double-booking).
 *
 * An in-process mutex (keyed by stylistId + startTime) serializes concurrent
 * requests BEFORE they hit Prisma. The DB transaction remains as a backstop
 * for races across multiple processes or serverless instances.
 *
 * Throws an Error with a user-facing message on conflict.
 */
export async function createBookingCore(params: CreateBookingParams) {
  const lockKey = `${params.stylistId}:${params.startTime.toISOString()}`;
  return withLock(lockKey, () =>
    prisma.$transaction(async (tx) => {
      const conflict = await validateBooking(
        params.stylistId,
        params.startTime,
        params.endTime,
        undefined,
        tx
      );

      if (conflict) {
        throw new Error(conflict);
      }

      return tx.booking.create({
        data: {
          startTime: params.startTime,
          endTime: params.endTime,
          price: params.price,
          notes: params.notes ?? null,
          clientId: params.clientId ?? null,
          guestName: params.guestName ?? null,
          guestPhone: params.guestPhone ?? null,
          serviceId: params.serviceId,
          stylistId: params.stylistId,
          salonId: params.salonId,
        },
      });
    })
  );
}
