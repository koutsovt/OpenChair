import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { addMinutes } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { createBookingCore } from '@/server/services/booking-service';
import { sendSMS, logSms } from '@/lib/twilio';
import { bookingConfirmationMessage } from '@/lib/sms-templates';
import { rateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

// Exact user-facing strings intentionally thrown by validateBooking /
// createBookingCore. Only these may be echoed to the caller; any other error
// (e.g. a raw Prisma exception) is logged server-side and masked to avoid
// leaking model/field/constraint internals (CWE-209).
const KNOWN_BOOKING_ERRORS = new Set([
  'This time slot conflicts with an existing booking',
  'End time must be after start time',
]);

const createBookingSchema = z.object({
  salonSlug: z.string().min(1),
  stylistId: z.string().min(1),
  serviceId: z.string().min(1),
  startTime: z.string().datetime(),
  clientName: z.string().min(1, 'Name is required'),
  clientPhone: z.string().min(6, 'Phone is required'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { allowed, remaining, resetMs } = rateLimit(`booking:${parsed.data.clientPhone}`);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many booking requests. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(resetMs / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const salon = await prisma.salon.findUnique({
    where: { slug: parsed.data.salonSlug, isActive: true },
  });

  if (!salon) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, salonId: salon.id, isActive: true },
  });

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const stylist = await prisma.stylist.findFirst({
    where: { id: parsed.data.stylistId, salonId: salon.id, isActive: true },
  });

  if (!stylist) {
    return NextResponse.json({ error: 'Stylist not found' }, { status: 404 });
  }

  const stylistService = await prisma.stylistService.findUnique({
    where: {
      stylistId_serviceId: { stylistId: stylist.id, serviceId: service.id },
    },
  });

  if (!stylistService) {
    return NextResponse.json(
      { error: 'This stylist does not offer this service' },
      { status: 400 }
    );
  }

  const duration = stylistService.durationOverride ?? service.duration;
  const price = stylistService.priceOverride ?? service.price;
  const startTime = new Date(parsed.data.startTime);
  const endTime = addMinutes(startTime, duration);

  let client = await prisma.client.findFirst({
    where: { phone: parsed.data.clientPhone, salonId: salon.id },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: parsed.data.clientName,
        phone: parsed.data.clientPhone,
        email: parsed.data.clientEmail || null,
        source: 'online-booking',
        salonId: salon.id,
      },
    });
  }

  let booking;
  try {
    booking = await createBookingCore({
      stylistId: stylist.id,
      serviceId: service.id,
      salonId: salon.id,
      startTime,
      endTime,
      price,
      clientId: client.id,
      notes: parsed.data.notes || null,
    });
  } catch (err) {
    const safe =
      err instanceof Error && KNOWN_BOOKING_ERRORS.has(err.message)
        ? err.message
        : 'Booking failed';
    if (safe === 'Booking failed') {
      log.error({ err }, 'createBooking failed');
    }
    return NextResponse.json({ error: safe }, { status: 409 });
  }

  if (client.phone && !client.smsOptOut) {
    const smsBody = bookingConfirmationMessage({
      clientName: client.name,
      salonName: salon.name,
      serviceName: service.name,
      stylistName: stylist.name,
      startTime,
      price,
    });
    const result = await sendSMS(client.phone, smsBody);
    void logSms({
      direction: 'OUTBOUND',
      phone: client.phone,
      body: smsBody,
      status: result.success ? 'sent' : 'failed',
      twilioSid: result.sid,
      bookingId: booking.id,
      clientId: client.id,
      salonId: salon.id,
    });
  }

  return NextResponse.json(
    {
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
    },
    {
      status: 201,
      headers: { 'X-RateLimit-Remaining': String(remaining) },
    }
  );
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
  }

  const phone = request.nextUrl.searchParams.get('phone');
  if (!phone) {
    return NextResponse.json({ error: 'phone query parameter is required' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      price: true,
      createdAt: true,
      guestPhone: true,
      client: { select: { phone: true } },
      service: { select: { id: true, name: true, duration: true, price: true } },
      stylist: { select: { id: true, name: true, imageUrl: true } },
      salon: { select: { id: true, name: true, slug: true, phone: true, address: true } },
    },
  });

  // Return 404 (not 403) on both missing booking and phone mismatch to avoid
  // leaking booking existence to anyone holding a leaked id (CWE-639).
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const bookingPhone = booking.client?.phone ?? booking.guestPhone;
  if (bookingPhone !== phone) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const { guestPhone: _guestPhone, client: _client, ...safeBooking } = booking;
  return NextResponse.json(safeBooking);
}
