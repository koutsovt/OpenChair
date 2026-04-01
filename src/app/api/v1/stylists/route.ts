import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const salonSlug = request.nextUrl.searchParams.get('salonSlug');
  if (!salonSlug) {
    return NextResponse.json({ error: 'salonSlug is required' }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({
    where: { slug: salonSlug, isActive: true },
    select: { id: true },
  });

  if (!salon) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
  }

  const stylists = await prisma.stylist.findMany({
    where: { salonId: salon.id, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      imageUrl: true,
      bio: true,
      sortOrder: true,
      availability: {
        where: { isActive: true },
        select: { dayOfWeek: true, startTime: true, endTime: true },
      },
      services: {
        select: {
          priceOverride: true,
          durationOverride: true,
          service: {
            select: { id: true, name: true, price: true, duration: true },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(stylists);
}
