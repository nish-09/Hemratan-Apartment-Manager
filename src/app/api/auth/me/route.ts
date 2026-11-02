import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { ROLE_PERMISSIONS } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      flatDetails: user.flatDetails,
      assignedFlatIds: user.assignedFlatIds,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    },
  });
}
