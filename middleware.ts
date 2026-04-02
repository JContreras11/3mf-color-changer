import { type NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE_NAME, isValidSessionToken } from './src/server/auth';

export function middleware(request: NextRequest) {
  const sessionValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (isValidSessionToken(sessionValue)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/', request.url);
  loginUrl.searchParams.set('auth', 'required');
  loginUrl.searchParams.set(
    'next',
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/editor/:path*', '/export/:path*'],
};
