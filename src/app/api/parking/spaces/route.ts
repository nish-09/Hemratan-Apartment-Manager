import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ParkingService, ParkingType, VehicleRestriction } from '@/services/parking.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/auth/rbac';

const createSpaceSchema = z.object({
  displayName: z.string().min(1, 'Display name is required (e.g. P6, B1-01)'),
  parkingType: z.enum(['VISITOR', 'TWO_WHEELER', 'FOUR_WHEELER', 'RESERVED']).optional(),
  location: z.string().optional(),
  vehicleTypeRestriction: z.enum(['TWO_WHEELER', 'FOUR_WHEELER', 'ANY']).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const spaces = ParkingService.getSpaces();
  return NextResponse.json({ spaces });
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || !hasPermission(user.role, PERMISSIONS.PARKING_MANAGE)) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to manage society parking spaces' },
      { status: 403 }
    );
  }

  // Only Committee or Super Admin can create/reconfigure parking spaces
  if (user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: Only Managing Committee or Super Admin can configure parking spaces' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = createSpaceSchema.parse(body);

    const space = ParkingService.createSpace({
      displayName: validated.displayName,
      parkingType: validated.parkingType as ParkingType,
      location: validated.location,
      vehicleTypeRestriction: validated.vehicleTypeRestriction as VehicleRestriction,
      notes: validated.notes,
      performedBy: user.id,
    });

    return NextResponse.json({ success: true, space }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create parking space' },
      { status: 400 }
    );
  }
}
