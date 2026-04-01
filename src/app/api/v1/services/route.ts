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

  const categories = await prisma.serviceCategory.findMany({
    where: { salonId: salon.id },
    select: {
      id: true,
      name: true,
      description: true,
      sortOrder: true,
      services: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          duration: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const uncategorized = await prisma.service.findMany({
    where: { salonId: salon.id, isActive: true, categoryId: null },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      duration: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({
    categories,
    uncategorized,
  });
}
