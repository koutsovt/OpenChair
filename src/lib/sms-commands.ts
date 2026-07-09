import { addMinutes } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { sendSMS, logSms } from '@/lib/twilio';
import { bookingCancellationMessage } from '@/lib/sms-templates';
import { createBookingCore } from '@/server/services/booking-service';

export type SmsCommand = 'CANCEL' | 'BOOK' | 'STOP' | null;

export function parseCommand(body: string): SmsCommand {
  const trimmed = body.trim().toUpperCase();
  if (trimmed === 'CANCEL') return 'CANCEL';
  if (trimmed === 'BOOK') return 'BOOK';
  if (trimmed === 'STOP') return 'STOP';
  return null;
}

// SECURITY (BP-002 follow-up): client identity here is derived solely from the
// inbound `From` number, which is only trustworthy because the route gates on a
// valid Twilio signature. Follow-up (not in scope here): add an out-of-band
// confirmation step for destructive commands (CANCEL / STOP / BOOK) as
// defense-in-depth against carrier-level number spoofing.
export async function executeCommand(
  phone: string,
  command: SmsCommand,
  salonId: string,
  rawBody: string
): Promise<string> {
  const client = await prisma.client.findFirst({
    where: { phone, salonId },
  });

  if (!client) {
    return "We couldn't find an account with this phone number.";
  }

  if (!command) {
    return forwardToSalon({
      clientId: client.id,
      clientName: client.name,
      clientPhone: phone,
      messageBody: rawBody,
      salonId,
    });
  }

  switch (command) {
    case 'CANCEL':
      return handleCancel(client.id, salonId, phone);
    case 'BOOK':
      return handleBook(client.id, salonId);
    case 'STOP':
      return handleStop(client.id, salonId);
  }
}

/**
 * Relay an inbound SMS to the salon owner's phone. Works for both known clients
 * and unknown senders (walk-ins, new enquiries) — `clientId`/`clientName` are
 * optional so a message from a number not yet in the CRM still reaches the salon
 * instead of being bounced.
 */
export async function forwardToSalon(params: {
  clientId?: string;
  clientName?: string;
  clientPhone: string;
  messageBody: string;
  salonId: string;
}): Promise<string> {
  const { clientId, clientName, clientPhone, messageBody, salonId } = params;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: { owner: { select: { phone: true, email: true, firstName: true } } },
  });

  const ownerPhone = salon?.owner?.phone ?? salon?.phone;
  if (!ownerPhone) {
    return 'Thanks for your message. Please call the salon directly for assistance.';
  }

  const sender = clientName ?? 'Unknown sender';
  const forwardBody = `SMS from ${sender} (${clientPhone}):\n"${messageBody}"`;
  const result = await sendSMS(ownerPhone, forwardBody);

  void logSms({
    direction: 'OUTBOUND',
    phone: ownerPhone,
    body: forwardBody,
    status: result.success ? 'sent' : 'failed',
    twilioSid: result.sid,
    clientId,
    salonId,
  });

  return 'Thanks for your message! The salon has been notified and will get back to you.';
}

async function handleCancel(clientId: string, salonId: string, phone: string): Promise<string> {
  const nextBooking = await prisma.booking.findFirst({
    where: {
      clientId,
      salonId,
      status: { in: ['CONFIRMED', 'PENDING'] },
      startTime: { gt: new Date() },
    },
    orderBy: { startTime: 'asc' },
    include: { salon: true, service: true, stylist: true, client: true },
  });

  if (!nextBooking) {
    return 'You have no upcoming appointments to cancel.';
  }

  await prisma.booking.update({
    where: { id: nextBooking.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: 'Cancelled via SMS',
    },
  });

  const clientName = nextBooking.client?.name ?? 'there';
  const replyBody = bookingCancellationMessage({
    clientName,
    salonName: nextBooking.salon.name,
    startTime: nextBooking.startTime,
  });

  const result = await sendSMS(phone, replyBody);
  void logSms({
    direction: 'OUTBOUND',
    phone,
    body: replyBody,
    status: result.success ? 'sent' : 'failed',
    twilioSid: result.sid,
    bookingId: nextBooking.id,
    clientId,
    salonId,
  });

  return `Your appointment on ${nextBooking.startTime.toISOString()} has been cancelled.`;
}

async function handleBook(clientId: string, salonId: string): Promise<string> {
  const waitlistEntry = await prisma.waitlistEntry.findFirst({
    where: {
      clientId,
      salonId,
      status: 'NOTIFIED',
      expiresAt: { gt: new Date() },
    },
    orderBy: { notifiedAt: 'desc' },
    include: { service: true },
  });

  if (!waitlistEntry) {
    return "No available slot to claim right now. We'll notify you when one opens up!";
  }

  if (!waitlistEntry.stylistId) {
    return 'No stylist assigned to this waitlist entry. Please contact the salon.';
  }

  const startTime = waitlistEntry.preferredDateStart;
  const endTime = addMinutes(startTime, waitlistEntry.service.duration);

  try {
    await createBookingCore({
      stylistId: waitlistEntry.stylistId,
      serviceId: waitlistEntry.serviceId,
      salonId,
      startTime,
      endTime,
      price: waitlistEntry.service.price,
      clientId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Booking failed';
    return `Could not book the slot: ${message}`;
  }

  await prisma.waitlistEntry.update({
    where: { id: waitlistEntry.id },
    data: { status: 'BOOKED' },
  });

  return "Your spot has been booked! We'll send you a confirmation shortly.";
}

async function handleStop(clientId: string, salonId: string): Promise<string> {
  await prisma.client.update({
    where: { id: clientId },
    data: { smsOptOut: true },
  });

  void logSms({
    direction: 'OUTBOUND',
    phone: '',
    body: 'Client opted out of SMS',
    status: 'opt-out',
    clientId,
    salonId,
  });

  return 'You have been unsubscribed from SMS notifications.';
}
