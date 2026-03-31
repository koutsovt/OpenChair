'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const stylistSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  bio: z.string().optional().or(z.literal('')),
});

const availabilitySchema = z.array(
  z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    isActive: z.boolean(),
  })
);

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

export async function createStylist(formData: FormData) {
  const salon = await getAuthenticatedSalon();

  const parsed = stylistSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    bio: formData.get('bio'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, phone, bio } = parsed.data;

  await prisma.stylist.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      bio: bio || null,
      salonId: salon.id,
    },
  });

  revalidatePath('/dashboard/team');
  return { success: true };
}

export async function updateStylist(id: string, formData: FormData) {
  const salon = await getAuthenticatedSalon();

  const stylist = await prisma.stylist.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!stylist) {
    throw new Error('Stylist not found');
  }

  const parsed = stylistSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    bio: formData.get('bio'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, phone, bio } = parsed.data;

  await prisma.stylist.update({
    where: { id },
    data: {
      name,
      email: email || null,
      phone: phone || null,
      bio: bio || null,
    },
  });

  revalidatePath('/dashboard/team');
  return { success: true };
}

export async function deleteStylist(id: string) {
  const salon = await getAuthenticatedSalon();

  const stylist = await prisma.stylist.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!stylist) {
    throw new Error('Stylist not found');
  }

  await prisma.stylist.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath('/dashboard/team');
  return { success: true };
}

export async function updateAvailability(
  stylistId: string,
  availability: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]
) {
  const salon = await getAuthenticatedSalon();

  const stylist = await prisma.stylist.findFirst({
    where: { id: stylistId, salonId: salon.id },
  });

  if (!stylist) {
    throw new Error('Stylist not found');
  }

  const parsed = availabilitySchema.safeParse(availability);
  if (!parsed.success) {
    return { error: 'Invalid availability data' };
  }

  await prisma.$transaction([
    prisma.stylistAvailability.deleteMany({
      where: { stylistId },
    }),
    prisma.stylistAvailability.createMany({
      data: parsed.data.map((slot) => ({
        stylistId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive,
      })),
    }),
  ]);

  revalidatePath('/dashboard/team');
  revalidatePath(`/dashboard/team/${stylistId}`);
  return { success: true };
}
