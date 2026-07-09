import { prisma } from '@/lib/prisma';
import { sendSMS, logSms } from '@/lib/twilio';
import { format } from 'date-fns';

type WaitlistMatch = {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  serviceId: string;
  stylistId: string | null;
};

/**
 * Find waitlist entries that match a freed slot.
 * Sorted by createdAt (FIFO).
 */
export async function matchWaitlistEntries(
  salonId: string,
  stylistId: string,
  serviceId: string,
  startTime: Date,
  endTime: Date
): Promise<WaitlistMatch[]> {
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      salonId,
      serviceId,
      status: 'WAITING',
      expiresAt: { gt: new Date() },
      preferredDateStart: { lte: startTime },
      preferredDateEnd: { gte: endTime },
      OR: [{ stylistId: null }, { stylistId }],
    },
    include: {
      client: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return entries
    .filter((entry) => {
      // Check time preferences if specified
      if (entry.preferredTimeStart) {
        const [h, m] = entry.preferredTimeStart.split(':').map(Number);
        const prefStart = h * 60 + m;
        const slotStart = startTime.getHours() * 60 + startTime.getMinutes();
        if (slotStart < prefStart) return false;
      }
      if (entry.preferredTimeEnd) {
        const [h, m] = entry.preferredTimeEnd.split(':').map(Number);
        const prefEnd = h * 60 + m;
        const slotEnd = endTime.getHours() * 60 + endTime.getMinutes();
        if (slotEnd > prefEnd) return false;
      }
      return true;
    })
    .map((entry) => ({
      id: entry.id,
      clientId: entry.client.id,
      clientName: entry.client.name,
      clientPhone: entry.client.phone,
      serviceId: entry.serviceId,
      stylistId: entry.stylistId,
    }));
}

/**
 * Notify a waitlisted client about an available slot and mark entry as NOTIFIED.
 */
export async function notifyWaitlistClient(
  entryId: string,
  slotDetails: {
    salonName: string;
    serviceName: string;
    stylistName: string;
    startTime: Date;
  }
): Promise<{ notified: boolean }> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    include: { client: { select: { name: true, phone: true, smsOptOut: true } } },
  });

  if (!entry || entry.status !== 'WAITING') {
    return { notified: false };
  }

  // Update status to NOTIFIED
  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: {
      status: 'NOTIFIED',
      notifiedAt: new Date(),
      // Expire 2 hours after notification
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  });

  // Send SMS if phone available and the client hasn't opted out of messages.
  if (entry.client.phone && !entry.client.smsOptOut) {
    const date = format(slotDetails.startTime, 'EEEE, d MMMM');
    const time = format(slotDetails.startTime, 'h:mm a');
    const message = `Hi ${entry.client.name}! A slot just opened up at ${slotDetails.salonName}! ${slotDetails.serviceName} with ${slotDetails.stylistName} on ${date} at ${time}. Reply BOOK to claim it.`;

    void sendSMS(entry.client.phone, message).then((result) =>
      logSms({
        direction: 'OUTBOUND',
        phone: entry.client.phone!,
        body: message,
        status: result.success ? 'sent' : 'failed',
        twilioSid: result.sid,
        clientId: entry.clientId,
        salonId: entry.salonId,
      })
    );
  }

  return { notified: true };
}
