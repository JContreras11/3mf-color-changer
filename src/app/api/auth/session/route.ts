import {
  AUTH_COOKIE_NAME,
  getAuthorizedUsername,
  isValidSessionToken,
} from '@/server/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = isValidSessionToken(sessionValue);

  return NextResponse.json(
    {
      authenticated,
      username: authenticated ? getAuthorizedUsername() : null,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
