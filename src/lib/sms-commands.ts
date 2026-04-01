import { prisma } from '@/lib/prisma';
import { sendSMS, logSms } from '@/lib/twilio';
import { bookingCancellationMessage } from '@/lib/sms-templates';

export type SmsCommand = 'CANCEL' | 'BOOK' | 'STOP' | null;

export function parseCommand(body: string): SmsCommand {
  const trimmed = body.trim().toUpperCase();
  if (trimmed === 'CANCEL') return 'CANCEL';
  if (trimmed === 'BOOK') return 'BOOK';
  if (trimmed === 'STOP') return 'STOP';
  return null;
}

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
    return forwardToSalon(client.id, client.name, phone, rawBody, salonId);
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

async function forwardToSalon(
  clientId: string,
  clientName: string,
  clientPhone: string,
  messageBody: string,
  salonId: string
): Promise<string> {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    include: { owner: { select: { phone: true, email: true, firstName: true } } },
  });

  const ownerPhone = salon?.owner?.phone ?? salon?.phone;
  if (!ownerPhone) {
    return 'Thanks for your message. Please call the salon directly for assistance.';
  }

  const forwardBody = `SMS from ${clientName} (${clientPhone}):\n"${messageBody}"`;
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
  });

  if (!waitlistEntry) {
    return "No available slot to claim right now. We'll notify you when one opens up!";
  }

  await prisma.waitlistEntry.update({
    where: { id: waitlistEntry.id },
    data: { status: 'BOOKED' },
  });

  return "Your spot has been claimed! We'll send you a confirmation shortly.";
}

async function handleStop(clientId: string, salonId: string): Promise<string> {
  await prisma.client.update({
    where: { id: clientId },
    data: { notes: 'SMS opt-out requested' },
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
