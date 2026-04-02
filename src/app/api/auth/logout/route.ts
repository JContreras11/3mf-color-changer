import { clearSessionCookie } from '@/server/auth';
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(clearSessionCookie());

  return response;
}
