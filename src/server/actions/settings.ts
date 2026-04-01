'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedSalon } from '@/server/auth';
import { salonThemeSchema } from '@/lib/theme';

export async function updateSalonTheme(data: unknown) {
  const salon = await getAuthenticatedSalon();
  const parsed = salonThemeSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const theme = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined && v !== '')
  );

  await prisma.salon.update({
    where: { id: salon.id },
    data: { theme: Object.keys(theme).length > 0 ? theme : Prisma.JsonNull },
  });

  revalidatePath('/', 'layout');
  return { success: true };
}
