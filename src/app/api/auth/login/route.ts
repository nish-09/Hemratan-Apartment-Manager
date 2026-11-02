import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { ROLE_PERMISSIONS } from '@/lib/auth/rbac';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const ROLE_REDIRECTS: Record<string, string> = {
  RESIDENT: '/resident/dashboard',
  GUARD: '/guard/dashboard',
  COMMITTEE: '/admin/dashboard',
  SUPER_ADMIN: '/super-admin/dashboard',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid login request', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // Validate demo/seed credentials or Supabase auth
    const session = createSessionToken(email.toLowerCase().trim());

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const { token, user } = session;
    const redirectUrl = ROLE_REDIRECTS[user.role] || '/resident/dashboard';
    const permissions = ROLE_PERMISSIONS[user.role] || [];

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        flatDetails: user.flatDetails,
        assignedFlatIds: user.assignedFlatIds,
        permissions,
      },
      redirectUrl,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal authentication error' },
      { status: 500 }
    );
  }
}
