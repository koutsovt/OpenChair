import { NextResponse } from 'next/server';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';
import { bookingReminderMessage } from '@/lib/sms-templates';
import { env } from '@/lib/env';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tomorrow = addDays(new Date(), 1);

  const bookings = await prisma.booking.findMany({
    where: {
      startTime: {
        gte: startOfDay(tomorrow),
        lte: endOfDay(tomorrow),
      },
      status: 'CONFIRMED',
    },
    include: {
      client: true,
      stylist: true,
      service: true,
      salon: true,
    },
  });

  const results = await Promise.allSettled(
    bookings.map(async (booking) => {
      const phone = booking.client?.phone ?? booking.guestPhone;
      const name = booking.client?.name ?? booking.guestName ?? 'there';

      if (!phone) {
        return { bookingId: booking.id, sent: false, reason: 'no phone' };
      }

      const message = bookingReminderMessage({
        clientName: name,
        salonName: booking.salon.name,
        serviceName: booking.service.name,
        stylistName: booking.stylist.name,
        startTime: booking.startTime,
      });

      const result = await sendSMS(phone, message);
      return { bookingId: booking.id, sent: result.success, error: result.error };
    })
  );

  return NextResponse.json({ processed: results.length, results });
}
