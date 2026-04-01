import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSalonByApiKey } from '@/lib/api-auth';
import type { SmsDirection } from '@/generated/prisma/enums';

export async function GET(request: NextRequest) {
  const salon = await authenticateSalonByApiKey(request);
  if (!salon) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '50')));
  const phone = searchParams.get('phone');
  const direction = searchParams.get('direction') as SmsDirection | null;
  const bookingId = searchParams.get('bookingId');

  const where = {
    salonId: salon.id,
    ...(phone ? { phone } : {}),
    ...(direction && (direction === 'INBOUND' || direction === 'OUTBOUND') ? { direction } : {}),
    ...(bookingId ? { bookingId } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.smsLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        direction: true,
        phone: true,
        body: true,
        status: true,
        twilioSid: true,
        bookingId: true,
        clientId: true,
        createdAt: true,
      },
    }),
    prisma.smsLog.count({ where }),
  ]);

  return NextResponse.json({
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
