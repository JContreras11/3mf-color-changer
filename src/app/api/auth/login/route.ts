import {
  createSessionCookie,
  getAuthorizedDisplayName,
  getAuthorizedUsername,
  validateLoginCredentials,
} from '@/server/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: string;
    username?: string;
  } | null;
  const username = body?.username || '';
  const password = body?.password || '';

  if (!validateLoginCredentials(username, password)) {
    return NextResponse.json(
      {
        error: 'Invalid username or password.',
      },
      {
        status: 401,
      }
    );
  }

  const response = NextResponse.json({
    displayName: getAuthorizedDisplayName(),
    ok: true,
    username: getAuthorizedUsername(),
  });

  response.cookies.set(createSessionCookie());

  return response;
}
