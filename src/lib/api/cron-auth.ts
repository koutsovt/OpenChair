/**
 * Higher-order function that guards cron route handlers behind a Bearer token.
 * Modeled after King's `secureHandle` / `assertTrustedSender` pattern.
 *
 * Usage:
 *   export const GET = withCronAuth(async (_req) => {
 *     return NextResponse.json({ ok: true });
 *   });
 */

import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

type Handler = (request: Request) => Promise<NextResponse> | NextResponse;

/**
 * Wraps `handler` so it only runs when the incoming `Authorization` header
 * matches `Bearer <CRON_SECRET>`. Returns 401 otherwise.
 */
export function withCronAuth(handler: Handler): Handler {
  return async (request: Request): Promise<NextResponse> => {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request);
  };
}
