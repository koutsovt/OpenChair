'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedSalon } from '@/server/auth';

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  allergies: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  hairType: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  hairTexture: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  naturalColour: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  preferredStylistId: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  productPreferences: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
});

export async function createClient(formData: FormData) {
  const salon = await getAuthenticatedSalon();

  const parsed = clientSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    notes: formData.get('notes'),
    birthDate: formData.get('birthDate'),
    source: formData.get('source'),
    allergies: formData.get('allergies'),
    hairType: formData.get('hairType'),
    hairTexture: formData.get('hairTexture'),
    naturalColour: formData.get('naturalColour'),
    preferredStylistId: formData.get('preferredStylistId'),
    productPreferences: formData.get('productPreferences'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    name,
    phone,
    email,
    notes,
    birthDate,
    source,
    allergies,
    hairType,
    hairTexture,
    naturalColour,
    preferredStylistId,
    productPreferences,
  } = parsed.data;

  // Duplicate check — look for an active client in this salon with the same phone
  // Uses direct DB query instead of full table scan. Loose match on raw phone value.
  const duplicate = await prisma.client.findFirst({
    where: { salonId: salon.id, isActive: true, phone },
    select: { id: true, name: true },
  });
  if (duplicate) {
    return { error: `A client with this phone number already exists: ${duplicate.name}` };
  }

  await prisma.client.create({
    data: {
      name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      source: source || null,
      allergies: allergies || null,
      hairType: hairType || null,
      hairTexture: hairTexture || null,
      naturalColour: naturalColour || null,
      preferredStylistId: preferredStylistId || null,
      productPreferences: productPreferences || null,
      salonId: salon.id,
    },
  });

  revalidatePath('/clients');
  return { success: true };
}

export async function updateClient(id: string, formData: FormData) {
  const salon = await getAuthenticatedSalon();

  const client = await prisma.client.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  const parsed = clientSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    notes: formData.get('notes'),
    birthDate: formData.get('birthDate'),
    source: formData.get('source'),
    allergies: formData.get('allergies'),
    hairType: formData.get('hairType'),
    hairTexture: formData.get('hairTexture'),
    naturalColour: formData.get('naturalColour'),
    preferredStylistId: formData.get('preferredStylistId'),
    productPreferences: formData.get('productPreferences'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    name,
    phone,
    email,
    notes,
    birthDate,
    source,
    allergies,
    hairType,
    hairTexture,
    naturalColour,
    preferredStylistId,
    productPreferences,
  } = parsed.data;

  await prisma.client.update({
    where: { id },
    data: {
      name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      source: source || null,
      allergies: allergies || null,
      hairType: hairType || null,
      hairTexture: hairTexture || null,
      naturalColour: naturalColour || null,
      preferredStylistId: preferredStylistId || null,
      productPreferences: productPreferences || null,
    },
  });

  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  return { success: true };
}

export async function deleteClient(id: string) {
  const salon = await getAuthenticatedSalon();

  const client = await prisma.client.findFirst({
    where: { id, salonId: salon.id },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  await prisma.client.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath('/clients');
  return { success: true };
}

export async function searchClients(query: string) {
  const salon = await getAuthenticatedSalon();

  const clients = await prisma.client.findMany({
    where: {
      salonId: salon.id,
      isActive: true,
      OR: [
        { name: { contains: query } },
        { phone: { contains: query } },
        { email: { contains: query } },
      ],
    },
    orderBy: { name: 'asc' },
    take: 20,
  });

  return clients;
}
