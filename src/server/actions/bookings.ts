'use server';

import { revalidatePath } from 'next/cache';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { validateBooking } from '@/lib/booking-validation';
import { getAvailableSlots } from '@/lib/slots';
import { createBookingSchema } from '@/lib/validations/booking';
import { sendSMS } from '@/lib/twilio';
import { bookingConfirmationMessage } from '@/lib/sms-templates';
import type { BookingStatus } from '@/types';

async function getAuthenticatedSalon() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error('Not authenticated');
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { salon: true },
  });

  if (!user?.salon) {
    throw new Error('No salon found');
  }

  return user.salon;
}

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

  const stylist = await prisma.stylist.findFirst({
    where: { id: parsed.data.stylistId, salonId: salon.id, isActive: true },
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

  const conflict = await validateBooking(stylist.id, startTime, endTime);
  if (conflict) {
    return { success: false, error: conflict };
  }

  const booking = await prisma.booking.create({
    data: {
      startTime,
      endTime,
      price: service.price,
      notes: parsed.data.notes || null,
      clientId: parsed.data.clientId || null,
      guestName: parsed.data.guestName || null,
      guestPhone: parsed.data.guestPhone || null,
      serviceId: service.id,
      stylistId: stylist.id,
      salonId: salon.id,
    },
  });

  // Send confirmation SMS (fire-and-forget)
  const phone = client?.phone ?? parsed.data.guestPhone;

  if (phone) {
    const clientName = client?.name ?? parsed.data.guestName ?? 'there';

    void sendSMS(
      phone,
      bookingConfirmationMessage({
        clientName,
        salonName: salon.name,
        serviceName: service.name,
        stylistName: stylist.name,
        startTime,
        price: service.price,
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

  revalidatePath('/bookings');
  revalidatePath(`/bookings/${id}`);
  return { success: true };
}

export async function rescheduleBooking(
  id: string,
  newStartTime: string
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const booking = await prisma.booking.findFirst({
    where: { id, salonId: salon.id },
    include: { service: true },
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  const start = new Date(newStartTime);
  const end = addMinutes(start, booking.service.duration);

  const conflict = await validateBooking(booking.stylistId, start, end, id);
  if (conflict) {
    return { success: false, error: conflict };
  }

  await prisma.booking.update({
    where: { id },
    data: { startTime: start, endTime: end },
  });

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
