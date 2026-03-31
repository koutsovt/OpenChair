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
