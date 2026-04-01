'use server';

import { revalidatePath } from 'next/cache';
import { addDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedSalon } from '@/server/auth';

export async function addToWaitlist(data: {
  clientId: string;
  serviceId: string;
  stylistId?: string;
  preferredDateStart: string;
  preferredDateEnd: string;
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, salonId: salon.id },
  });
  if (!client) return { success: false, error: 'Client not found' };

  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, salonId: salon.id },
  });
  if (!service) return { success: false, error: 'Service not found' };

  if (data.stylistId) {
    const stylist = await prisma.stylist.findFirst({
      where: { id: data.stylistId, salonId: salon.id, isActive: true },
    });
    if (!stylist) return { success: false, error: 'Stylist not found' };
  }

  const entry = await prisma.waitlistEntry.create({
    data: {
      clientId: data.clientId,
      serviceId: data.serviceId,
      stylistId: data.stylistId ?? null,
      salonId: salon.id,
      preferredDateStart: new Date(data.preferredDateStart),
      preferredDateEnd: new Date(data.preferredDateEnd),
      preferredTimeStart: data.preferredTimeStart ?? null,
      preferredTimeEnd: data.preferredTimeEnd ?? null,
      expiresAt: addDays(new Date(data.preferredDateEnd), 1),
    },
  });

  revalidatePath('/bookings/waitlist');
  return { success: true, id: entry.id };
}

export async function cancelWaitlistEntry(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const salon = await getAuthenticatedSalon();

  const entry = await prisma.waitlistEntry.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!entry) {
    return { success: false, error: 'Waitlist entry not found' };
  }

  await prisma.waitlistEntry.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  revalidatePath('/bookings/waitlist');
  return { success: true };
}

export async function listWaitlistEntries() {
  const salon = await getAuthenticatedSalon();

  return prisma.waitlistEntry.findMany({
    where: { salonId: salon.id },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true } },
      stylist: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
