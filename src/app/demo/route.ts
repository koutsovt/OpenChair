/**
 * Magic-link demo sign-in: GET /demo
 *
 * Signs the visitor in as the demo account (demo@openchair.dev) with zero
 * friction, then redirects to the dashboard. Works ONLY for the hard-coded
 * demo email — there is no ?email= param and no way to sign in anyone else.
 *
 * Safety:
 *  - Hard-coded email guard (cannot be overridden by request)
 *  - IP-based rate-limit: 10 req/min
 *  - JWT encoded with same NEXTAUTH_SECRET as the rest of the app
 */

import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';

const DEMO_EMAIL = 'demo@openchair.dev';
// Next-auth JWT cookie name (strategy: "jwt", no custom cookieName override)
const COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

export async function GET(request: NextRequest) {
  // Rate-limit: 10 req/min per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed } = rateLimit(`demo:${ip}`, { windowMs: 60_000, max: 10 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Look up demo user — only proceed if the exact demo account exists
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Demo account not found' }, { status: 404 });
  }

  // Build a NextAuth-compatible JWT payload (mirrors authOptions callbacks)
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    },
    secret: env.NEXTAUTH_SECRET,
  });

  // Use NEXTAUTH_URL as the base so the redirect works correctly behind Railway's
  // reverse proxy (request.url resolves to the internal 0.0.0.0 address in prod).
  const base = env.NEXTAUTH_URL ?? request.url;
  const response = NextResponse.redirect(new URL('/dashboard', base));
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
