import { NextRequest, NextResponse } from 'next/server';
import { ParkingService } from '@/services/parking.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/auth/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || !hasPermission(user.role, PERMISSIONS.PARKING_MANAGE)) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to checkout parking allocations' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const updatedAllocation = ParkingService.checkoutParking(id, user.id);

    return NextResponse.json({
      success: true,
      message: `Parking space "${updatedAllocation.parkingSpaceDisplayName}" released successfully`,
      allocation: updatedAllocation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to checkout parking space' },
      { status: 400 }
    );
  }
}
