import { NextRequest, NextResponse } from 'next/server';
import { subDays, addDays, format } from 'date-fns';
import { prisma } from '@/lib/prisma';

function formatICalDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stylistId: string }> }
) {
  const { stylistId } = await params;
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  const stylist = await prisma.stylist.findFirst({
    where: { id: stylistId, calendarToken: token },
    include: { salon: { select: { name: true } } },
  });

  if (!stylist) {
    return NextResponse.json({ error: 'Invalid token or stylist' }, { status: 401 });
  }

  const now = new Date();
  const windowStart = subDays(now, 30);
  const windowEnd = addDays(now, 90);

  const bookings = await prisma.booking.findMany({
    where: {
      stylistId,
      startTime: { gte: windowStart },
      endTime: { lte: windowEnd },
      status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
    },
    include: {
      service: { select: { name: true } },
      client: { select: { name: true, phone: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  const events = bookings.map((booking) => {
    const clientName = booking.client?.name ?? booking.guestName ?? 'Walk-in';
    const summary = escapeICalText(`${booking.service.name} — ${clientName}`);
    const descriptionParts: string[] = [];
    const phone = booking.client?.phone ?? booking.guestPhone;
    if (phone) descriptionParts.push(`Phone: ${phone}`);
    if (booking.notes) descriptionParts.push(`Notes: ${booking.notes}`);
    const description = escapeICalText(descriptionParts.join('\n'));

    return [
      'BEGIN:VEVENT',
      `UID:${booking.id}@openchair`,
      `DTSTART:${formatICalDate(booking.startTime)}`,
      `DTEND:${formatICalDate(booking.endTime)}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : '',
      `DTSTAMP:${formatICalDate(now)}`,
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n');
  });

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenChair//Salon Calendar//EN',
    `X-WR-CALNAME:${escapeICalText(stylist.name)} — ${escapeICalText(stylist.salon.name)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(calendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="calendar.ics"',
    },
  });
}
