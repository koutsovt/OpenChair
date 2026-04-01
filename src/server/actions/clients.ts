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
});

/** Strip non-digit characters for loose duplicate matching (handles spaces, dashes, parentheses) */
function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function createClient(formData: FormData) {
  const salon = await getAuthenticatedSalon();

  const parsed = clientSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    notes: formData.get('notes'),
    birthDate: formData.get('birthDate'),
    source: formData.get('source'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, phone, email, notes, birthDate, source } = parsed.data;

  // Duplicate check — look for an active client in this salon with the same phone digits
  const normalisedPhone = normalisePhone(phone);
  const existingClients = await prisma.client.findMany({
    where: { salonId: salon.id, isActive: true, phone: { not: null } },
    select: { id: true, name: true, phone: true },
  });
  const duplicate = existingClients.find(
    (c) => c.phone && normalisePhone(c.phone) === normalisedPhone
  );
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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, phone, email, notes, birthDate, source } = parsed.data;

  await prisma.client.update({
    where: { id },
    data: {
      name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      source: source || null,
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
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: 20,
  });

  return clients;
}
