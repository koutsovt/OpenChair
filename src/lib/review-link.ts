import { env } from '@/lib/env';

/**
 * Builds Google's officially supported "write a review" deep link.
 * Uses the Place ID (permanent, survives name/address changes) rather than a
 * name-based search URL, which can break or land on the wrong listing.
 */
export function googleWriteReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/**
 * First-party redirect URL we hand to clients instead of the raw Google link.
 * Lets us record `clickedAt` server-side before the 302, without needing a
 * tracking param the Google endpoint doesn't support, and avoids the
 * deliverability hit of a third-party link shortener.
 */
export function reviewRedirectUrl(linkToken: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}/r/${linkToken}`;
}
