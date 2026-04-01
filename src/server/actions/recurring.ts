'use server';

import { revalidatePath } from 'next/cache';
import { addWeeks } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedSalon } from '@/server/auth';

export async function createRecurringBooking(data: {
  clientId: string;
  serviceId: string;
  stylistId: string;
  intervalWeeks: number;
  dayOfWeek: number;
  preferredTime: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  if (data.intervalWeeks < 1 || data.intervalWeeks > 52) {
    return { success: false, error: 'Interval must be between 1 and 52 weeks' };
  }

  if (data.dayOfWeek < 0 || data.dayOfWeek > 6) {
    return { success: false, error: 'Invalid day of week' };
  }

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, salonId: salon.id },
  });
  if (!client) return { success: false, error: 'Client not found' };

  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, salonId: salon.id },
  });
  if (!service) return { success: false, error: 'Service not found' };

  const stylist = await prisma.stylist.findFirst({
    where: { id: data.stylistId, salonId: salon.id, isActive: true },
  });
  if (!stylist) return { success: false, error: 'Stylist not found' };

  // Calculate the next run date (next occurrence of the preferred day)
  const now = new Date();
  let nextRunDate = new Date(now);
  while (nextRunDate.getDay() !== data.dayOfWeek) {
    nextRunDate.setDate(nextRunDate.getDate() + 1);
  }
  // If it's today but we've passed the preferred time, go to next week
  if (nextRunDate.toDateString() === now.toDateString()) {
    const [h, m] = data.preferredTime.split(':').map(Number);
    if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) {
      nextRunDate = addWeeks(nextRunDate, 1);
    }
  }

  const recurring = await prisma.recurringBooking.create({
    data: {
      intervalWeeks: data.intervalWeeks,
      dayOfWeek: data.dayOfWeek,
      preferredTime: data.preferredTime,
      nextRunDate,
      clientId: data.clientId,
      serviceId: data.serviceId,
      stylistId: data.stylistId,
      salonId: salon.id,
    },
  });

  revalidatePath('/bookings/recurring');
  return { success: true, id: recurring.id };
}

export async function updateRecurringBooking(
  id: string,
  data: {
    intervalWeeks?: number;
    dayOfWeek?: number;
    preferredTime?: string;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const recurring = await prisma.recurringBooking.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!recurring) {
    return { success: false, error: 'Recurring booking not found' };
  }

  await prisma.recurringBooking.update({
    where: { id },
    data: {
      intervalWeeks: data.intervalWeeks,
      dayOfWeek: data.dayOfWeek,
      preferredTime: data.preferredTime,
    },
  });

  revalidatePath('/bookings/recurring');
  return { success: true };
}

export async function pauseRecurringBooking(
  id: string,
  pause: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const recurring = await prisma.recurringBooking.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!recurring) {
    return { success: false, error: 'Recurring booking not found' };
  }

  await prisma.recurringBooking.update({
    where: { id },
    data: { isActive: !pause },
  });

  revalidatePath('/bookings/recurring');
  return { success: true };
}

export async function deleteRecurringBooking(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const recurring = await prisma.recurringBooking.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!recurring) {
    return { success: false, error: 'Recurring booking not found' };
  }

  await prisma.recurringBooking.delete({ where: { id } });

  revalidatePath('/bookings/recurring');
  return { success: true };
}

export async function listRecurringBookings() {
  const salon = await getAuthenticatedSalon();

  return prisma.recurringBooking.findMany({
    where: { salonId: salon.id },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true, duration: true, price: true } },
      stylist: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
