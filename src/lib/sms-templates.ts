import { format } from 'date-fns';
import { formatPrice } from '@/lib/utils';

export function bookingConfirmationMessage(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  stylistName: string;
  startTime: Date;
  price: number;
}): string {
  const date = format(params.startTime, 'EEEE, d MMMM');
  const time = format(params.startTime, 'h:mm a');
  return `Hi ${params.clientName}! Your appointment at ${params.salonName} is confirmed.\n\n${params.serviceName} with ${params.stylistName}\n${date} at ${time}\n${formatPrice(params.price)}\n\nReply CANCEL to cancel.`;
}

export function bookingReminderMessage(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  stylistName: string;
  startTime: Date;
}): string {
  const time = format(params.startTime, 'h:mm a');
  return `Reminder: ${params.clientName}, you have an appointment tomorrow at ${params.salonName} — ${params.serviceName} with ${params.stylistName} at ${time}. Reply CANCEL to cancel.`;
}

export function bookingCancellationMessage(params: {
  clientName: string;
  salonName: string;
  startTime: Date;
}): string {
  const date = format(params.startTime, 'EEEE, d MMMM');
  const time = format(params.startTime, 'h:mm a');
  return `Hi ${params.clientName}, your appointment at ${params.salonName} on ${date} at ${time} has been cancelled. Book again anytime!`;
}

export function bookingRescheduledMessage(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  stylistName: string;
  startTime: Date;
}): string {
  const date = format(params.startTime, 'EEEE, d MMMM');
  const time = format(params.startTime, 'h:mm a');
  return `Hi ${params.clientName}, your appointment at ${params.salonName} has been moved to ${date} at ${time} — ${params.serviceName} with ${params.stylistName}. Reply CANCEL to cancel.`;
}

export function recurringBookingMessage(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  stylistName: string;
  startTime: Date;
}): string {
  const date = format(params.startTime, 'EEEE, d MMMM');
  const time = format(params.startTime, 'h:mm a');
  return `Hi ${params.clientName}! Your recurring appointment at ${params.salonName} has been booked: ${params.serviceName} with ${params.stylistName} on ${date} at ${time}. Reply CANCEL to cancel.`;
}

export function waitlistNotificationMessage(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  stylistName: string;
  startTime: Date;
}): string {
  const date = format(params.startTime, 'EEEE, d MMMM');
  const time = format(params.startTime, 'h:mm a');
  return `Hi ${params.clientName}! A slot just opened up at ${params.salonName}! ${params.serviceName} with ${params.stylistName} on ${date} at ${time}. Reply BOOK to claim it.`;
}

export function waitlistExpiredMessage(params: { clientName: string; salonName: string }): string {
  return `Hi ${params.clientName}, the slot we notified you about at ${params.salonName} has expired. We'll let you know when another opens up!`;
}
