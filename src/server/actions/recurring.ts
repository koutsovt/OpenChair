'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedSalon } from '@/server/auth';

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
