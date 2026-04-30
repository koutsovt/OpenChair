import { NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { processRecurringBooking } from '@/lib/scheduling/recurring';
import { sendSMS, logSms } from '@/lib/twilio';
import { recurringBookingMessage } from '@/lib/sms-templates';
import { env } from '@/lib/env';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lookAhead = addDays(new Date(), 14);

  const recurringBookings = await prisma.recurringBooking.findMany({
    where: {
      isActive: true,
      nextRunDate: { lte: lookAhead },
    },
    include: {
      client: { select: { id: true, name: true, phone: true, smsOptOut: true } },
      service: { select: { name: true } },
      stylist: { select: { name: true } },
      salon: { select: { id: true, name: true } },
    },
  });

  const results = await Promise.allSettled(
    recurringBookings.map(async (recurring) => {
      const result = await processRecurringBooking(recurring.id);

      if (result.success && recurring.client.phone && !recurring.client.smsOptOut) {
        const booking = await prisma.booking.findUnique({
          where: { id: result.bookingId },
        });

        if (booking) {
          const message = recurringBookingMessage({
            clientName: recurring.client.name,
            salonName: recurring.salon.name,
            serviceName: recurring.service.name,
            stylistName: recurring.stylist.name,
            startTime: booking.startTime,
          });

          const smsResult = await sendSMS(recurring.client.phone, message);

          void logSms({
            direction: 'OUTBOUND',
            phone: recurring.client.phone,
            body: message,
            status: smsResult.success ? 'sent' : 'failed',
            twilioSid: smsResult.sid,
            bookingId: booking.id,
            clientId: recurring.client.id,
            salonId: recurring.salon.id,
          });
        }
      }

      return { recurringId: recurring.id, ...result };
    })
  );

  return NextResponse.json({ processed: results.length, results });
}
