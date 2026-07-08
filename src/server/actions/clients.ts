'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { parse, isValid } from 'date-fns';
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

// Fields that can be targeted by a CSV import column mapping.
export const IMPORT_FIELDS = [
  'name',
  'phone',
  'email',
  'notes',
  'birthDate',
  'source',
  'allergies',
  'hairType',
  'hairTexture',
  'naturalColour',
  'productPreferences',
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

const importRowSchema = z.object({
  name: z.string({ error: 'name is required' }).trim().min(1, 'name is required'),
  phone: z.string().trim().optional().default(''),
  email: z.string().trim().email().optional().or(z.literal('')),
  notes: z.string().trim().optional().default(''),
  birthDate: z.string().trim().optional().default(''),
  source: z.string().trim().optional().default(''),
  allergies: z.string().trim().optional().default(''),
  hairType: z.string().trim().optional().default(''),
  hairTexture: z.string().trim().optional().default(''),
  naturalColour: z.string().trim().optional().default(''),
  productPreferences: z.string().trim().optional().default(''),
});

// Accepted date formats for imported birth dates. Day-first (AU/NZ, e.g.
// Kitomba) is tried before month-first so "04/11/1975" reads as 4 November.
const DATE_FORMATS = ['dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'MM/dd/yyyy'] as const;

function parseImportDate(value: string): Date | null {
  for (const format of DATE_FORMATS) {
    const parsed = parse(value, format, new Date());
    if (isValid(parsed)) {
      // Normalise to UTC midnight so the stored date can't drift across timezones.
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
    }
  }
  return null;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Bulk-import clients from parsed CSV rows (records keyed by OpenChair field name).
 * Rows the caller failed to map keep only the fields provided. Invalid rows and
 * phone-duplicates are skipped and reported, not thrown — a partial import still
 * succeeds. Duplicate detection covers both existing DB clients and repeats
 * within the uploaded file itself.
 */
export async function importClients(
  rows: Array<Partial<Record<ImportField, string>>>
): Promise<ImportResult> {
  const salon = await getAuthenticatedSalon();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { imported: 0, skipped: 0, errors: ['No rows to import'] };
  }
  if (rows.length > 5000) {
    return {
      imported: 0,
      skipped: 0,
      errors: ['Too many rows — split into files of 5000 or fewer'],
    };
  }

  const errors: string[] = [];

  // Existing phone numbers for this salon, to skip duplicates in one query.
  const existing = await prisma.client.findMany({
    where: { salonId: salon.id, isActive: true, phone: { not: null } },
    select: { phone: true },
  });
  const seenPhones = new Set(existing.map((c) => c.phone).filter((p): p is string => Boolean(p)));

  const toCreate: Array<{
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    birthDate: Date | null;
    source: string | null;
    allergies: string | null;
    hairType: string | null;
    hairTexture: string | null;
    naturalColour: string | null;
    productPreferences: string | null;
    salonId: string;
  }> = [];

  rows.forEach((row, i) => {
    const lineNo = i + 1;
    const parsed = importRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push(`Row ${lineNo}: ${parsed.error.issues[0].message}`);
      return;
    }
    const r = parsed.data;

    const phone = r.phone || null;
    if (phone && seenPhones.has(phone)) {
      errors.push(`Row ${lineNo}: duplicate phone ${phone} — skipped`);
      return;
    }
    if (phone) seenPhones.add(phone);

    let birthDate: Date | null = null;
    if (r.birthDate) {
      birthDate = parseImportDate(r.birthDate);
      if (!birthDate) {
        errors.push(`Row ${lineNo}: invalid birth date "${r.birthDate}" — imported without it`);
      }
    }

    toCreate.push({
      name: r.name,
      phone,
      email: r.email || null,
      notes: r.notes || null,
      birthDate,
      source: r.source || null,
      allergies: r.allergies || null,
      hairType: r.hairType || null,
      hairTexture: r.hairTexture || null,
      naturalColour: r.naturalColour || null,
      productPreferences: r.productPreferences || null,
      salonId: salon.id,
    });
  });

  if (toCreate.length > 0) {
    await prisma.client.createMany({ data: toCreate });
    revalidatePath('/clients');
  }

  return {
    imported: toCreate.length,
    skipped: rows.length - toCreate.length,
    errors,
  };
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
    include: { preferredStylist: { select: { name: true } } },
    orderBy: { name: 'asc' },
    take: 20,
  });

  return clients;
}
