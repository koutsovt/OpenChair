import { NextRequest, NextResponse } from 'next/server';
import { startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAvailableSlots } from '@/lib/slots';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const salonSlug = searchParams.get('salonSlug');
  const stylistId = searchParams.get('stylistId');
  const serviceId = searchParams.get('serviceId');
  const date = searchParams.get('date');

  if (!salonSlug || !stylistId || !serviceId || !date) {
    return NextResponse.json(
      { error: 'salonSlug, stylistId, serviceId, and date are required' },
      { status: 400 }
    );
  }

  const salon = await prisma.salon.findUnique({
    where: { slug: salonSlug, isActive: true },
    select: { id: true, timezone: true },
  });

  if (!salon) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
  }

  const stylist = await prisma.stylist.findFirst({
    where: { id: stylistId, salonId: salon.id, isActive: true },
    include: { availability: true },
  });

  if (!stylist) {
    return NextResponse.json({ error: 'Stylist not found' }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId: salon.id, isActive: true },
  });

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const stylistService = await prisma.stylistService.findUnique({
    where: {
      stylistId_serviceId: { stylistId: stylist.id, serviceId: service.id },
    },
  });

  const duration = stylistService?.durationOverride ?? service.duration;
  const targetDate = new Date(date);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  const existingBookings = await prisma.booking.findMany({
    where: {
      stylistId,
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { startTime: true, endTime: true, status: true },
  });

  const slots = getAvailableSlots(
    targetDate,
    stylist.availability,
    existingBookings,
    duration,
    salon.timezone
  );

  return NextResponse.json(
    slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
    }))
  );
}
