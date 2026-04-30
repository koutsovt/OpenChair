import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      price: true,
      cancelledAt: true,
      createdAt: true,
      service: { select: { id: true, name: true, duration: true, price: true } },
      stylist: { select: { id: true, name: true, imageUrl: true } },
      salon: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  return NextResponse.json(booking);
}

const cancelSchema = z.object({
  phone: z.string().min(6, 'Phone is required for verification'),
  reason: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { allowed, resetMs } = rateLimit(`cancel:${parsed.data.phone}`, { max: 5 });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many cancellation requests. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) },
      }
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const bookingPhone = booking.client?.phone ?? booking.guestPhone;
  if (bookingPhone !== parsed.data.phone) {
    return NextResponse.json({ error: 'Phone number does not match booking' }, { status: 403 });
  }

  if (booking.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
  }

  if (booking.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Cannot cancel a completed booking' }, { status: 400 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: parsed.data.reason ?? 'Cancelled via API',
    },
    select: {
      id: true,
      status: true,
      cancelledAt: true,
      cancelReason: true,
    },
  });

  return NextResponse.json(updated);
}
