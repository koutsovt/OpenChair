import { subHours, subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { sendSMS, logSms } from '@/lib/twilio';
import { reviewRequestMessage, reviewRequestFollowUpMessage } from '@/lib/sms-templates';
import { reviewRedirectUrl } from '@/lib/review-link';

// Wait 1hr after a visit completes before asking — long enough that the ask
// isn't tangled up with checkout, short enough the visit is still fresh.
const INITIAL_DELAY_HOURS = 1;
// Single follow-up, only if the client never opened the first link.
const FOLLOW_UP_AFTER_DAYS = 3;

/**
 * Creates and sends the initial review request for every COMPLETED booking
 * that doesn't have one yet. Runs automatically (cron) — no staff action
 * required, so there's never an in-person "would you mind leaving a
 * review?" moment to manage.
 *
 * Sent identically to every eligible client regardless of how the visit
 * went or whether they rebooked: Google's review-gating policy prohibits
 * selectively soliciting customers likely to leave positive feedback.
 * Eligibility requires explicit marketing SMS consent (`reviewSmsConsent`),
 * which is separate from and stricter than the transactional-reminder
 * consent implied by `smsOptOut`.
 */
export async function sendInitialReviewRequests(): Promise<{
  processed: number;
  sent: number;
}> {
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'COMPLETED',
      endTime: { lte: subHours(new Date(), INITIAL_DELAY_HOURS) },
      reviewRequest: null,
      client: {
        isNot: null,
        is: {
          smsOptOut: false,
          reviewSmsConsent: true,
          phone: { not: null },
        },
      },
      salon: { is: { googlePlaceId: { not: null } } },
    },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      salon: { select: { id: true, name: true } },
    },
  });

  const results = await Promise.allSettled(
    bookings.map(async (booking) => {
      const client = booking.client!;
      const phone = client.phone!;

      const reviewRequest = await prisma.reviewRequest.create({
        data: { bookingId: booking.id, clientId: client.id, salonId: booking.salonId },
      });

      const message = reviewRequestMessage({
        clientName: client.name,
        salonName: booking.salon.name,
        reviewUrl: reviewRedirectUrl(reviewRequest.linkToken),
      });

      const result = await sendSMS(phone, message);

      if (result.success) {
        await prisma.reviewRequest.update({
          where: { id: reviewRequest.id },
          data: { sentAt: new Date() },
        });
      } else {
        // Send failed — delete the row instead of leaving it stale. The
        // eligibility query above filters on `reviewRequest: null`, so a
        // surviving unsent row would permanently exclude this booking from
        // every future cron run instead of being retried.
        await prisma.reviewRequest.delete({ where: { id: reviewRequest.id } });
      }

      void logSms({
        direction: 'OUTBOUND',
        phone,
        body: message,
        status: result.success ? 'sent' : 'failed',
        twilioSid: result.sid,
        bookingId: booking.id,
        clientId: client.id,
        salonId: booking.salonId,
      });

      return result.success;
    })
  );

  return {
    processed: results.length,
    sent: results.filter((r) => r.status === 'fulfilled' && r.value).length,
  };
}

/**
 * Sends the single allowed follow-up for review requests that went unclicked
 * for FOLLOW_UP_AFTER_DAYS. Capped at one follow-up per booking (enforced by
 * the followUpSentAt filter, not a nag loop) and skipped entirely once the
 * client clicks through, opts out, or revokes review-SMS consent.
 */
export async function sendReviewRequestFollowUps(): Promise<{
  processed: number;
  sent: number;
}> {
  const pending = await prisma.reviewRequest.findMany({
    where: {
      sentAt: { lte: subDays(new Date(), FOLLOW_UP_AFTER_DAYS) },
      followUpSentAt: null,
      clickedAt: null,
      client: { smsOptOut: false, reviewSmsConsent: true, phone: { not: null } },
    },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      salon: { select: { id: true, name: true } },
      booking: { select: { id: true } },
    },
  });

  const results = await Promise.allSettled(
    pending.map(async (reviewRequest) => {
      const phone = reviewRequest.client.phone!;

      const message = reviewRequestFollowUpMessage({
        clientName: reviewRequest.client.name,
        salonName: reviewRequest.salon.name,
        reviewUrl: reviewRedirectUrl(reviewRequest.linkToken),
      });

      const result = await sendSMS(phone, message);

      await prisma.reviewRequest.update({
        where: { id: reviewRequest.id },
        data: { followUpSentAt: result.success ? new Date() : undefined },
      });

      void logSms({
        direction: 'OUTBOUND',
        phone,
        body: message,
        status: result.success ? 'sent' : 'failed',
        twilioSid: result.sid,
        bookingId: reviewRequest.booking.id,
        clientId: reviewRequest.client.id,
        salonId: reviewRequest.salonId,
      });

      return result.success;
    })
  );

  return {
    processed: results.length,
    sent: results.filter((r) => r.status === 'fulfilled' && r.value).length,
  };
}
