import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySession, revokeSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    const payload = verifySession(sessionCookie.value);
    if (payload?.sessionId) {
      // Invalidate session on the server side to prevent token replay
      revokeSession(payload.sessionId);
    }
  }

  const response = NextResponse.json({ success: true, message: 'Logged out and session revoked successfully' });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
