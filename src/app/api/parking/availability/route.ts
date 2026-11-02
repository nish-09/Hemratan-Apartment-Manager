import { NextRequest, NextResponse } from 'next/server';
import { ParkingService } from '@/services/parking.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const availability = ParkingService.getAvailabilityOverview();

  return NextResponse.json(availability);
}
