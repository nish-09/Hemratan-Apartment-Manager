import { NextRequest, NextResponse } from 'next/server';
import { DirectoryService } from '@/services/directory.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const activeStaff = DirectoryService.getActiveStaffInside();

    return NextResponse.json({
      activeInside: activeStaff,
      count: activeStaff.length,
    });
  } catch (error) {
    console.error('Error fetching active workers inside:', error);
    return NextResponse.json({ error: 'Failed to fetch active inside workers' }, { status: 500 });
  }
}
