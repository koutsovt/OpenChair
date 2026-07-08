'use server';

import { revalidatePath } from 'next/cache';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { validateBooking, findConflictingBooking } from '@/lib/booking-validation';
import { createBookingCore } from '@/server/services/booking-service';
import { getAvailableSlots } from '@/lib/slots';
import { createBookingSchema } from '@/lib/validations/booking';
import { sendSMS, logSms } from '@/lib/twilio';
import {
  bookingConfirmationMessage,
  bookingRescheduledMessage,
  rebookNudgeMessage,
} from '@/lib/sms-templates';
import { env } from '@/lib/env';
import { autoAssignStylist } from '@/lib/scheduling/auto-assign';
import { matchWaitlistEntries, notifyWaitlistClient } from '@/lib/scheduling/waitlist';
import { getSuggestedSlots as getSuggestedSlotsLib } from '@/lib/scheduling/smart-suggestions';
import { getAuthenticatedSalon } from '@/server/auth';
import type { BookingStatus } from '@/types';

export async function createBooking(data: {
  stylistId: string;
  serviceId: string;
  clientId?: string;
  guestName?: string;
  guestPhone?: string;
  startTime: string;
  notes?: string;
}): Promise<{ success: true; bookingId: string } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const parsed = createBookingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, salonId: salon.id },
  });

  if (!service) {
    return { success: false, error: 'Service not found' };
  }

  // Auto-assign stylist if requested
  let resolvedStylistId = parsed.data.stylistId;
  if (resolvedStylistId === 'auto') {
    const startTime = new Date(parsed.data.startTime);
    const assignment = await autoAssignStylist(
      salon.id,
      parsed.data.serviceId,
      startTime,
      parsed.data.clientId
    );
    if (!assignment) {
      return { success: false, error: 'No available stylist for this time' };
    }
    resolvedStylistId = assignment.stylistId;
  }

  const stylist = await prisma.stylist.findFirst({
    where: { id: resolvedStylistId, salonId: salon.id, isActive: true },
  });

  if (!stylist) {
    return { success: false, error: 'Stylist not found' };
  }

  let client: {
    id: string;
    name: string;
    phone: string | null;
    smsOptOut: boolean;
  } | null = null;
  if (parsed.data.clientId) {
    client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, salonId: salon.id },
      select: { id: true, name: true, phone: true, smsOptOut: true },
    });
    if (!client) {
      return { success: false, error: 'Client not found' };
    }
  }

  const startTime = new Date(parsed.data.startTime);
  const endTime = addMinutes(startTime, service.duration);

  let booking;
  try {
    booking = await createBookingCore({
      stylistId: stylist.id,
      serviceId: service.id,
      salonId: salon.id,
      startTime,
      endTime,
      price: service.price,
      clientId: parsed.data.clientId || null,
      guestName: parsed.data.guestName || null,
      guestPhone: parsed.data.guestPhone || null,
      notes: parsed.data.notes || null,
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Booking failed' };
  }

  // Send confirmation SMS (fire-and-forget). Skip if the client has opted out;
  // guest bookings (no client record) always receive their confirmation.
  const phone = client?.phone ?? parsed.data.guestPhone;

  if (phone && !client?.smsOptOut) {
    const clientName = client?.name ?? parsed.data.guestName ?? 'there';
    const smsBody = bookingConfirmationMessage({
      clientName,
      salonName: salon.name,
      serviceName: service.name,
      stylistName: stylist.name,
      startTime,
      price: service.price,
    });
    void sendSMS(phone, smsBody).then((result) =>
      logSms({
        direction: 'OUTBOUND',
        phone,
        body: smsBody,
        status: result.success ? 'sent' : 'failed',
        twilioSid: result.sid,
        bookingId: booking.id,
        clientId: client?.id,
        salonId: salon.id,
      })
    );
  }

  revalidatePath('/bookings');
  return { success: true, bookingId: booking.id };
}

/**
 * Convert a completed guest booking into a linked Client. Reuses an existing
 * client with the same phone in this salon (guests often become repeat walk-ins
 * under the same number) rather than creating duplicates. The booking is
 * relinked to the client and its guest fields cleared.
 */
async function promoteGuestToClient(
  salonId: string,
  booking: { id: string; guestName: string; guestPhone: string | null }
): Promise<void> {
  const phone = booking.guestPhone?.trim() || null;

  const existing = phone
    ? await prisma.client.findFirst({
        where: { salonId, phone, isActive: true },
        select: { id: true },
      })
    : null;

  const client =
    existing ??
    (await prisma.client.create({
      data: {
        name: booking.guestName,
        phone,
        source: 'guest',
        salonId,
      },
      select: { id: true },
    }));

  await prisma.booking.update({
    where: { id: booking.id },
    data: { clientId: client.id, guestName: null, guestPhone: null },
  });
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const booking = await prisma.booking.findFirst({
    where: { id, salonId: salon.id },
    include: { service: true, stylist: true },
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  await prisma.booking.update({
    where: { id },
    data: {
      status,
      cancelledAt: status === 'CANCELLED' ? new Date() : undefined,
    },
  });

  // Promote a guest to a returning customer once their first visit completes:
  // create (or reuse) a Client from the guest details and link this booking to
  // it, so future bookings recognise them instead of re-entering guest info.
  if (status === 'COMPLETED' && !booking.clientId && booking.guestName) {
    await promoteGuestToClient(salon.id, {
      id: booking.id,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
    });
    revalidatePath('/clients');
  }

  // When a booking is cancelled, check waitlist for matching entries
  if (status === 'CANCELLED') {
    void (async () => {
      const matches = await matchWaitlistEntries(
        salon.id,
        booking.stylistId,
        booking.serviceId,
        booking.startTime,
        booking.endTime
      );

      if (matches.length > 0) {
        await notifyWaitlistClient(matches[0].id, {
          salonName: salon.name,
          serviceName: booking.service.name,
          stylistName: booking.stylist.name,
          startTime: booking.startTime,
        });
      }
    })();
  }

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${id}`);
  return { success: true };
}

/**
 * Send a one-off "come back soon" SMS for a completed visit. Guarded so the
 * salon can't accidentally spam: requires a linked client with a phone number
 * who hasn't opted out, hasn't already rebooked, and hasn't been nudged for
 * this booking before.
 */
export async function sendRebookNudge(
  bookingId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, salonId: salon.id },
    include: {
      client: { select: { id: true, name: true, phone: true, smsOptOut: true } },
      service: { select: { name: true } },
      stylist: { select: { name: true } },
    },
  });

  if (!booking) return { success: false, error: 'Booking not found' };
  if (booking.status !== 'COMPLETED') {
    return { success: false, error: 'Nudges can only be sent for completed visits' };
  }
  if (!booking.client?.phone) {
    return { success: false, error: 'Client has no phone number on file' };
  }
  if (booking.client.smsOptOut) {
    return { success: false, error: 'Client has opted out of SMS' };
  }

  const [upcoming, alreadyNudged] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        clientId: booking.client.id,
        salonId: salon.id,
        startTime: { gt: new Date() },
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { id: true },
    }),
    prisma.smsLog.findFirst({
      where: {
        bookingId: booking.id,
        direction: 'OUTBOUND',
        status: 'sent',
        createdAt: { gt: booking.endTime },
      },
      select: { id: true },
    }),
  ]);

  if (upcoming) {
    return { success: false, error: `${booking.client.name} already has an upcoming booking` };
  }
  if (alreadyNudged) {
    return { success: false, error: 'A rebooking nudge was already sent for this visit' };
  }

  const body = rebookNudgeMessage({
    clientName: booking.client.name,
    salonName: salon.name,
    serviceName: booking.service.name,
    stylistName: booking.stylist.name,
    bookingUrl: `${env.NEXT_PUBLIC_APP_URL}/book/${salon.slug}`,
  });

  const result = await sendSMS(booking.client.phone, body);
  await logSms({
    direction: 'OUTBOUND',
    phone: booking.client.phone,
    body,
    status: result.success ? 'sent' : 'failed',
    twilioSid: result.sid,
    bookingId: booking.id,
    clientId: booking.client.id,
    salonId: salon.id,
  });

  if (!result.success) {
    return { success: false, error: result.error ?? 'SMS send failed' };
  }

  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

export async function rescheduleBooking(
  id: string,
  newStartTime: string,
  newStylistId?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const booking = await prisma.booking.findFirst({
    where: { id, salonId: salon.id },
    include: { service: true, client: true, stylist: true },
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  const targetStylistId = newStylistId ?? booking.stylistId;

  // If changing stylist, validate the new stylist exists and offers the service
  if (newStylistId && newStylistId !== booking.stylistId) {
    const newStylist = await prisma.stylist.findFirst({
      where: { id: newStylistId, salonId: salon.id, isActive: true },
    });
    if (!newStylist) {
      return { success: false, error: 'Stylist not found' };
    }

    const hasService = await prisma.stylistService.findUnique({
      where: { stylistId_serviceId: { stylistId: newStylistId, serviceId: booking.serviceId } },
    });
    if (!hasService) {
      return { success: false, error: 'Stylist does not offer this service' };
    }
  }

  const start = new Date(newStartTime);
  const end = addMinutes(start, booking.service.duration);

  const conflict = await validateBooking(targetStylistId, start, end, id);
  if (conflict) {
    return { success: false, error: conflict };
  }

  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      startTime: start,
      endTime: end,
      stylistId: targetStylistId,
    },
    include: { stylist: true, service: true },
  });

  // Send rescheduled SMS to client (skip opted-out clients; guests always sent)
  const phone = booking.client?.phone ?? booking.guestPhone;
  if (phone && !booking.client?.smsOptOut) {
    const clientName = booking.client?.name ?? booking.guestName ?? 'there';
    const smsBody = bookingRescheduledMessage({
      clientName,
      salonName: salon.name,
      serviceName: updatedBooking.service.name,
      stylistName: updatedBooking.stylist.name,
      startTime: start,
    });
    void sendSMS(phone, smsBody).then((result) =>
      logSms({
        direction: 'OUTBOUND',
        phone,
        body: smsBody,
        status: result.success ? 'sent' : 'failed',
        twilioSid: result.sid,
        bookingId: id,
        clientId: booking.clientId ?? undefined,
        salonId: salon.id,
      })
    );
  }

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${id}`);
  return { success: true };
}

export async function getAvailableSlotsAction(
  stylistId: string,
  serviceId: string,
  date: string
): Promise<{ start: string; end: string }[]> {
  const salon = await getAuthenticatedSalon();

  const stylist = await prisma.stylist.findFirst({
    where: { id: stylistId, salonId: salon.id, isActive: true },
    include: { availability: true },
  });

  if (!stylist) return [];

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id },
  });

  if (!service) return [];

  const targetDate = new Date(date);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  const existingBookings = await prisma.booking.findMany({
    where: {
      stylistId,
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { startTime: true, endTime: true, status: true },
  });

  const slots = getAvailableSlots(
    targetDate,
    stylist.availability,
    existingBookings,
    service.duration,
    salon.timezone
  );

  return slots.map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
  }));
}

/**
 * Fallback finder for when auto-assign fails at a chosen time. Returns any
 * stylists who offer the service and are free at that exact slot, and — if none
 * are — the nearest alternative slots that day (across all qualifying stylists).
 */
export async function getSlotAlternativesAction(
  serviceId: string,
  startTime: string
): Promise<{
  freeStylists: { id: string; name: string }[];
  nearbySlots: { start: string; end: string; stylistId: string; stylistName: string }[];
}> {
  const salon = await getAuthenticatedSalon();

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id },
    select: { duration: true },
  });
  if (!service) return { freeStylists: [], nearbySlots: [] };

  const start = new Date(startTime);
  const end = addMinutes(start, service.duration);
  const dayOfWeek = start.getDay();

  // Stylists who offer this service and are rostered on this day
  const stylists = await prisma.stylist.findMany({
    where: {
      salonId: salon.id,
      isActive: true,
      services: { some: { serviceId } },
      availability: { some: { dayOfWeek, isActive: true } },
    },
    select: { id: true, name: true },
  });
  if (stylists.length === 0) return { freeStylists: [], nearbySlots: [] };

  // Which of them are free at the exact requested slot?
  const conflicts = await Promise.all(
    stylists.map((s) => findConflictingBooking(s.id, start, end))
  );
  const freeStylists = stylists.filter((_, i) => conflicts[i] === null);

  if (freeStylists.length > 0) {
    return { freeStylists, nearbySlots: [] };
  }

  // Nobody free at that time — offer the nearest slots that day, closest first.
  const suggestions = await getSuggestedSlotsLib(
    salon.id,
    serviceId,
    undefined,
    startOfDay(start),
    endOfDay(start),
    20
  );
  const nearbySlots = suggestions
    .map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      stylistId: s.stylistId,
      stylistName: s.stylistName,
      distance: Math.abs(s.start.getTime() - start.getTime()),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map(({ distance: _distance, ...rest }) => rest);

  return { freeStylists: [], nearbySlots };
}

export async function reassignStylistBookings(
  absentStylistId: string,
  date: string,
  targetStylistId?: string
): Promise<
  | {
      success: true;
      reassigned: number;
      failed: { bookingId: string; error: string }[];
    }
  | { success: false; error: string }
> {
  const salon = await getAuthenticatedSalon();

  const absentStylist = await prisma.stylist.findFirst({
    where: { id: absentStylistId, salonId: salon.id },
  });
  if (!absentStylist) {
    return { success: false, error: 'Stylist not found' };
  }

  if (targetStylistId) {
    const target = await prisma.stylist.findFirst({
      where: { id: targetStylistId, salonId: salon.id, isActive: true },
    });
    if (!target) {
      return { success: false, error: 'Target stylist not found' };
    }
  }

  const targetDate = new Date(date);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  const bookings = await prisma.booking.findMany({
    where: {
      stylistId: absentStylistId,
      salonId: salon.id,
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: { service: true, client: true },
  });

  if (bookings.length === 0) {
    return { success: true, reassigned: 0, failed: [] };
  }

  let reassigned = 0;
  const failed: { bookingId: string; error: string }[] = [];

  for (const booking of bookings) {
    let newStylistId = targetStylistId;

    if (!newStylistId) {
      const assignment = await autoAssignStylist(
        salon.id,
        booking.serviceId,
        booking.startTime,
        booking.clientId ?? undefined
      );
      if (!assignment) {
        failed.push({ bookingId: booking.id, error: 'No available stylist' });
        continue;
      }
      newStylistId = assignment.stylistId;
    }

    const conflict = await validateBooking(
      newStylistId,
      booking.startTime,
      booking.endTime,
      booking.id
    );
    if (conflict) {
      failed.push({ bookingId: booking.id, error: conflict });
      continue;
    }

    const hasService = await prisma.stylistService.findUnique({
      where: {
        stylistId_serviceId: { stylistId: newStylistId, serviceId: booking.serviceId },
      },
    });
    if (!hasService) {
      failed.push({ bookingId: booking.id, error: 'Target stylist does not offer this service' });
      continue;
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { stylistId: newStylistId },
      include: { stylist: true },
    });

    const phone = booking.client?.phone ?? booking.guestPhone;
    if (phone && !booking.client?.smsOptOut) {
      const clientName = booking.client?.name ?? booking.guestName ?? 'there';
      const smsBody = bookingRescheduledMessage({
        clientName,
        salonName: salon.name,
        serviceName: booking.service.name,
        stylistName: updated.stylist.name,
        startTime: booking.startTime,
      });
      void sendSMS(phone, smsBody).then((result) =>
        logSms({
          direction: 'OUTBOUND',
          phone,
          body: smsBody,
          status: result.success ? 'sent' : 'failed',
          twilioSid: result.sid,
          bookingId: booking.id,
          clientId: booking.clientId ?? undefined,
          salonId: salon.id,
        })
      );
    }

    reassigned++;
  }

  revalidatePath('/bookings');
  return { success: true, reassigned, failed };
}

export async function getSuggestedSlotsAction(
  serviceId: string,
  stylistId: string | undefined,
  startDate: string,
  endDate: string,
  limit?: number
): Promise<
  {
    start: string;
    end: string;
    stylistId: string;
    stylistName: string;
    score: number;
    reason: string;
  }[]
> {
  const salon = await getAuthenticatedSalon();

  const suggestions = await getSuggestedSlotsLib(
    salon.id,
    serviceId,
    stylistId,
    new Date(startDate),
    new Date(endDate),
    limit
  );

  return suggestions.map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    stylistId: s.stylistId,
    stylistName: s.stylistName,
    score: s.score,
    reason: s.reason,
  }));
}
