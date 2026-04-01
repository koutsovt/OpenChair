'use server';

import { revalidatePath } from 'next/cache';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { validateBooking } from '@/lib/booking-validation';
import { createBookingCore } from '@/server/services/booking-service';
import { getAvailableSlots } from '@/lib/slots';
import { createBookingSchema } from '@/lib/validations/booking';
import { sendSMS, logSms } from '@/lib/twilio';
import { bookingConfirmationMessage, bookingRescheduledMessage } from '@/lib/sms-templates';
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

  let client: { id: string; name: string; phone: string | null } | null = null;
  if (parsed.data.clientId) {
    client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, salonId: salon.id },
      select: { id: true, name: true, phone: true },
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

  // Send confirmation SMS (fire-and-forget)
  const phone = client?.phone ?? parsed.data.guestPhone;

  if (phone) {
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

  // Send rescheduled SMS to client
  const phone = booking.client?.phone ?? booking.guestPhone;
  if (phone) {
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
    if (phone) {
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
