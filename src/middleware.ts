import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const exactPublicPaths = new Set(['/', '/book', '/cancel']);
const prefixPublicPaths = ['/sign-in', '/sign-up', '/api/auth', '/api/v1/', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (exactPublicPaths.has(pathname) || prefixPublicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  if (!token) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
