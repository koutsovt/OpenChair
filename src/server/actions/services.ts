'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().or(z.literal('')),
  price: z.number().min(0, 'Price must be positive'),
  duration: z.number().min(1, 'Duration is required'),
  categoryId: z.string().optional().or(z.literal('')),
});

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});

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

export async function createService(formData: FormData) {
  const salon = await getAuthenticatedSalon();

  const priceInDollars = parseFloat(formData.get('price') as string);
  const duration = parseInt(formData.get('duration') as string, 10);

  const parsed = serviceSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: isNaN(priceInDollars) ? -1 : Math.round(priceInDollars * 100),
    duration: isNaN(duration) ? 0 : duration,
    categoryId: formData.get('categoryId'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, description, price, duration: dur, categoryId } = parsed.data;

  await prisma.service.create({
    data: {
      name,
      description: description || null,
      price,
      duration: dur,
      categoryId: categoryId || null,
      salonId: salon.id,
    },
  });

  revalidatePath('/services');
  return { success: true };
}

export async function updateService(id: string, formData: FormData) {
  const salon = await getAuthenticatedSalon();

  const service = await prisma.service.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const priceInDollars = parseFloat(formData.get('price') as string);
  const duration = parseInt(formData.get('duration') as string, 10);

  const parsed = serviceSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: isNaN(priceInDollars) ? -1 : Math.round(priceInDollars * 100),
    duration: isNaN(duration) ? 0 : duration,
    categoryId: formData.get('categoryId'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, description, price, duration: dur, categoryId } = parsed.data;

  await prisma.service.update({
    where: { id },
    data: {
      name,
      description: description || null,
      price,
      duration: dur,
      categoryId: categoryId || null,
    },
  });

  revalidatePath('/services');
  return { success: true };
}

export async function deleteService(id: string) {
  const salon = await getAuthenticatedSalon();

  const service = await prisma.service.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  await prisma.service.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath('/services');
  return { success: true };
}

export async function createCategory(formData: FormData) {
  const salon = await getAuthenticatedSalon();

  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.serviceCategory.create({
    data: {
      name: parsed.data.name,
      salonId: salon.id,
    },
  });

  revalidatePath('/services');
  return { success: true };
}

export async function deleteCategory(id: string) {
  const salon = await getAuthenticatedSalon();

  const category = await prisma.serviceCategory.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  await prisma.serviceCategory.delete({
    where: { id },
  });

  revalidatePath('/services');
  return { success: true };
}

export async function assignStylistToService(stylistId: string, serviceId: string) {
  const salon = await getAuthenticatedSalon();

  const [stylist, service] = await Promise.all([
    prisma.stylist.findFirst({ where: { id: stylistId, salonId: salon.id } }),
    prisma.service.findFirst({ where: { id: serviceId, salonId: salon.id } }),
  ]);

  if (!stylist || !service) {
    throw new Error('Stylist or service not found');
  }

  await prisma.stylistService.create({
    data: { stylistId, serviceId },
  });

  revalidatePath('/services');
  return { success: true };
}

export async function removeStylistFromService(stylistId: string, serviceId: string) {
  const salon = await getAuthenticatedSalon();

  const [stylist, service] = await Promise.all([
    prisma.stylist.findFirst({ where: { id: stylistId, salonId: salon.id } }),
    prisma.service.findFirst({ where: { id: serviceId, salonId: salon.id } }),
  ]);

  if (!stylist || !service) {
    throw new Error('Stylist or service not found');
  }

  await prisma.stylistService.delete({
    where: { stylistId_serviceId: { stylistId, serviceId } },
  });

  revalidatePath('/services');
  return { success: true };
}
