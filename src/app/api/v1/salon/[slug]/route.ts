import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const salon = await prisma.salon.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      timezone: true,
      imageUrl: true,
    },
  });

  if (!salon) {
    return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
  }

  return NextResponse.json(salon);
}
