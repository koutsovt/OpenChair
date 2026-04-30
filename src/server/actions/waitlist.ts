'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedSalon } from '@/server/auth';

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
