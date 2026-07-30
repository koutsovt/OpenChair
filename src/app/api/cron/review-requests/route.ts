import { NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/api/cron-auth';
import {
  sendInitialReviewRequests,
  sendReviewRequestFollowUps,
} from '@/lib/scheduling/review-requests';

/**
 * Fully automated — no staff action triggers this. Runs on a schedule (e.g.
 * hourly) to: (1) send the initial review request for newly-completed
 * bookings, and (2) send the single follow-up for requests left unclicked
 * after the wait window. Keeps review solicitation off the salon floor
 * entirely, so there's never an in-person ask to get right or wrong.
 */
async function handler(_request: Request): Promise<NextResponse> {
  const [initial, followUp] = await Promise.all([
    sendInitialReviewRequests(),
    sendReviewRequestFollowUps(),
  ]);

  return NextResponse.json({ initial, followUp });
}

export const GET = withCronAuth(handler);
