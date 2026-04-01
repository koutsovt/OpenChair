import { prisma } from '@/lib/prisma';
import { validateBooking } from '@/lib/booking-validation';

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
 * Throws an Error with a user-facing message on conflict.
 */
export async function createBookingCore(params: CreateBookingParams) {
  return prisma.$transaction(async (tx) => {
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
  });
}
