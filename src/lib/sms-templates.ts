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

/**
 * Post-visit review request. Deliberately neutral wording — no sentiment
 * steering ("how happy were you"), no employee-name ask, no incentive. Sent
 * identically to every eligible client regardless of predicted satisfaction,
 * per Google's review-gating policy.
 */
export function reviewRequestMessage(params: {
  clientName: string;
  salonName: string;
  reviewUrl: string;
}): string {
  return `Hi ${params.clientName}, it's ${params.salonName}. Thanks for coming in — if you have a minute, we'd really appreciate your honest thoughts here: ${params.reviewUrl}. Reply STOP to opt out.`;
}

/**
 * Single follow-up, sent only if the client hasn't clicked the original link.
 * Same neutral tone, no added pressure or urgency language.
 */
export function reviewRequestFollowUpMessage(params: {
  clientName: string;
  salonName: string;
  reviewUrl: string;
}): string {
  return `Hi ${params.clientName}, just circling back — if you get a moment, we'd love your honest thoughts on your visit to ${params.salonName}: ${params.reviewUrl}. Reply STOP to opt out.`;
}

export function rebookNudgeMessage(params: {
  clientName: string;
  salonName: string;
  serviceName: string;
  stylistName: string;
  bookingUrl: string;
}): string {
  return `Hi ${params.clientName}! Thanks for visiting ${params.salonName}. ${params.stylistName} would love to see you again — book your next ${params.serviceName} anytime: ${params.bookingUrl}`;
}
