import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { googleWriteReviewUrl } from '@/lib/review-link';
import { log } from '@/lib/logger';

/**
 * Public, unauthenticated redirect: /r/{token} -> Google "write a review".
 * Records the first click as our best available proxy for "the client
 * responded" (Google doesn't expose which customer authored a review), which
 * the follow-up cron job uses to skip clients who already engaged.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;

  const reviewRequest = await prisma.reviewRequest.findUnique({
    where: { linkToken: token },
    include: { salon: { select: { googlePlaceId: true, slug: true } } },
  });

  if (!reviewRequest || !reviewRequest.salon.googlePlaceId) {
    log.error({ token }, 'Review redirect: unknown token or salon has no Google Place ID');
    return NextResponse.redirect(new URL('/', _request.url));
  }

  if (!reviewRequest.clickedAt) {
    await prisma.reviewRequest.update({
      where: { id: reviewRequest.id },
      data: { clickedAt: new Date() },
    });
  }

  return NextResponse.redirect(googleWriteReviewUrl(reviewRequest.salon.googlePlaceId));
}
