'use server';

import { z } from 'zod';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { validateBooking } from '@/lib/booking-validation';
import { getAvailableSlots } from '@/lib/slots';
import { sendSMS } from '@/lib/twilio';
import { bookingConfirmationMessage } from '@/lib/sms-templates';

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

  const conflict = await validateBooking(stylist.id, startTime, endTime);
  if (conflict) {
    return { success: false, error: conflict };
  }

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

  const booking = await prisma.booking.create({
    data: {
      startTime,
      endTime,
      price,
      notes: parsed.data.notes || null,
      clientId: client.id,
      serviceId: service.id,
      stylistId: stylist.id,
      salonId: salon.id,
    },
  });

  // Send confirmation SMS (fire-and-forget)
  if (client.phone) {
    void sendSMS(
      client.phone,
      bookingConfirmationMessage({
        clientName: client.name,
        salonName: salon.name,
        serviceName: service.name,
        stylistName: stylist.name,
        startTime,
        price,
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
