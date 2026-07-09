'use server';

import { z } from 'zod';
import { addDays, addMinutes, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { createBookingCore } from '@/server/services/booking-service';
import { getAvailableSlots } from '@/lib/slots';
import { sendSMS, logSms } from '@/lib/twilio';
import { bookingConfirmationMessage } from '@/lib/sms-templates';
import type { AlternativeSlot } from '@/types';

const publicBookingSchema = z.object({
  salonSlug: z.string().min(1),
  stylistId: z.string().min(1),
  serviceId: z.string().min(1),
  startTime: z.string().datetime(),
  clientName: z.string().min(1, 'Name is required'),
  clientPhone: z.string().min(6, 'Phone is required'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function createPublicBooking(
  data: z.input<typeof publicBookingSchema>
): Promise<{ success: true; bookingId: string } | { success: false; error: string }> {
  const parsed = publicBookingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const salon = await prisma.salon.findUnique({
    where: { slug: parsed.data.salonSlug, isActive: true },
  });

  if (!salon) {
    return { success: false, error: 'Salon not found' };
  }

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, salonId: salon.id, isActive: true },
  });

  if (!service) {
    return { success: false, error: 'Service not found' };
  }

  const stylist = await prisma.stylist.findFirst({
    where: { id: parsed.data.stylistId, salonId: salon.id, isActive: true },
  });

  if (!stylist) {
    return { success: false, error: 'Stylist not found' };
  }

  const stylistService = await prisma.stylistService.findUnique({
    where: {
      stylistId_serviceId: {
        stylistId: stylist.id,
        serviceId: service.id,
      },
    },
  });

  if (!stylistService) {
    return { success: false, error: 'This stylist does not offer this service' };
  }

  const duration = stylistService.durationOverride ?? service.duration;
  const price = stylistService.priceOverride ?? service.price;
  const startTime = new Date(parsed.data.startTime);
  const endTime = addMinutes(startTime, duration);

  // Find or create client by phone + salon
  let client = await prisma.client.findFirst({
    where: { phone: parsed.data.clientPhone, salonId: salon.id },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: parsed.data.clientName,
        phone: parsed.data.clientPhone,
        email: parsed.data.clientEmail || null,
        source: 'online-booking',
        salonId: salon.id,
      },
    });
  }

  let booking;
  try {
    booking = await createBookingCore({
      stylistId: stylist.id,
      serviceId: service.id,
      salonId: salon.id,
      startTime,
      endTime,
      price,
      clientId: client.id,
      notes: parsed.data.notes || null,
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Booking failed' };
  }

  // Send confirmation SMS (fire-and-forget). Respect opt-out — a returning
  // client who previously texted STOP must not receive automated messages.
  if (client.phone && !client.smsOptOut) {
    const smsBody = bookingConfirmationMessage({
      clientName: client.name,
      salonName: salon.name,
      serviceName: service.name,
      stylistName: stylist.name,
      startTime,
      price,
    });
    const smsResult = sendSMS(client.phone, smsBody);
    void smsResult.then((result) =>
      logSms({
        direction: 'OUTBOUND',
        phone: client.phone!,
        body: smsBody,
        status: result.success ? 'sent' : 'failed',
        twilioSid: result.sid,
        bookingId: booking.id,
        clientId: client.id,
        salonId: salon.id,
      })
    );
  }

  return { success: true, bookingId: booking.id };
}

export async function getPublicAvailableSlots(
  salonSlug: string,
  stylistId: string,
  serviceId: string,
  date: string
): Promise<{ start: string; end: string }[]> {
  const salon = await prisma.salon.findUnique({
    where: { slug: salonSlug, isActive: true },
  });

  if (!salon) return [];

  const stylist = await prisma.stylist.findFirst({
    where: { id: stylistId, salonId: salon.id, isActive: true },
    include: { availability: true },
  });

  if (!stylist) return [];

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id, isActive: true },
  });

  if (!service) return [];

  const stylistService = await prisma.stylistService.findUnique({
    where: {
      stylistId_serviceId: { stylistId: stylist.id, serviceId: service.id },
    },
  });

  const duration = stylistService?.durationOverride ?? service.duration;

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
    duration,
    salon.timezone
  );

  return slots.map((s) => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
  }));
}

/**
 * Return up to `limit` alternative available slots nearest to `requestedTime`,
 * across the requested stylist first, then other stylists who offer the same
 * service. Searches ±2 hours same day + the next 3 days.
 */
export async function getAlternativeSlots(
  salonSlug: string,
  stylistId: string,
  serviceId: string,
  requestedTime: Date,
  limit = 5
): Promise<AlternativeSlot[]> {
  const salon = await prisma.salon.findUnique({
    where: { slug: salonSlug, isActive: true },
    select: { id: true, timezone: true },
  });
  if (!salon) return [];

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id, isActive: true },
    select: { id: true, duration: true },
  });
  if (!service) return [];

  // All active stylists who offer this service, preferred stylist first.
  const allStylists = await prisma.stylist.findMany({
    where: {
      salonId: salon.id,
      isActive: true,
      services: { some: { serviceId: service.id } },
    },
    include: {
      availability: { where: { isActive: true } },
      services: { where: { serviceId: service.id } },
    },
  });

  if (allStylists.length === 0) return [];

  // Sort so the originally-requested stylist comes first.
  allStylists.sort((a, _b) => (a.id === stylistId ? -1 : 1));

  const candidates: AlternativeSlot[] = [];
  // Search same day + next 3 days (enough to find 5 slots in almost all cases).
  const searchDays = 4;

  for (let dayOffset = 0; dayOffset < searchDays && candidates.length < limit * 2; dayOffset++) {
    const targetDate = addDays(startOfDay(requestedTime), dayOffset);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    for (const stylist of allStylists) {
      const duration = stylist.services[0]?.durationOverride ?? service.duration;

      const existingBookings = await prisma.booking.findMany({
        where: {
          stylistId: stylist.id,
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
        duration,
        salon.timezone
      );

      for (const slot of slots) {
        candidates.push({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          stylistId: stylist.id,
          stylistName: stylist.name,
        });
      }
    }
  }

  // Sort by proximity to requestedTime and dedupe same-start + same-stylist.
  const seen = new Set<string>();
  candidates.sort(
    (a, b) =>
      Math.abs(new Date(a.start).getTime() - requestedTime.getTime()) -
      Math.abs(new Date(b.start).getTime() - requestedTime.getTime())
  );

  const results: AlternativeSlot[] = [];
  for (const c of candidates) {
    const key = `${c.stylistId}:${c.start}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(c);
    }
    if (results.length >= limit) break;
  }

  return results;
}

const joinWaitlistSchema = z.object({
  salonSlug: z.string().min(1),
  stylistId: z.string().min(1),
  serviceId: z.string().min(1),
  preferredDate: z.string().datetime(),
  contactName: z.string().min(1, 'Name is required'),
  contactPhone: z.string().min(6, 'Phone is required'),
});

/**
 * Public (unauthenticated) waitlist join — creates or updates a client record
 * and adds a WaitlistEntry for the requested date window.
 */
export async function joinPublicWaitlist(
  data: z.input<typeof joinWaitlistSchema>
): Promise<{ success: true; entryId: string } | { success: false; error: string }> {
  const parsed = joinWaitlistSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const salon = await prisma.salon.findUnique({
    where: { slug: parsed.data.salonSlug, isActive: true },
  });
  if (!salon) return { success: false, error: 'Salon not found' };

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, salonId: salon.id, isActive: true },
  });
  if (!service) return { success: false, error: 'Service not found' };

  const stylist = await prisma.stylist.findFirst({
    where: { id: parsed.data.stylistId, salonId: salon.id, isActive: true },
  });
  if (!stylist) return { success: false, error: 'Stylist not found' };

  // Find or create client.
  let client = await prisma.client.findFirst({
    where: { phone: parsed.data.contactPhone, salonId: salon.id },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: parsed.data.contactName,
        phone: parsed.data.contactPhone,
        source: 'online-booking',
        salonId: salon.id,
      },
    });
  }

  const preferredDate = new Date(parsed.data.preferredDate);
  const prefStart = startOfDay(preferredDate);
  const prefEnd = addDays(prefStart, 7); // open for 7 days from requested date
  const expiresAt = addDays(prefStart, 14);

  const entry = await prisma.waitlistEntry.create({
    data: {
      status: 'WAITING',
      preferredDateStart: prefStart,
      preferredDateEnd: prefEnd,
      expiresAt,
      clientId: client.id,
      serviceId: service.id,
      stylistId: stylist.id,
      salonId: salon.id,
    },
  });

  return { success: true, entryId: entry.id };
}
