import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ParkingService, ParkingType, VehicleRestriction } from '@/services/parking.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const updateSpaceSchema = z.object({
  displayName: z.string().min(1).optional(),
  parkingType: z.enum(['VISITOR', 'TWO_WHEELER', 'FOUR_WHEELER', 'RESERVED']).optional(),
  location: z.string().optional(),
  vehicleTypeRestriction: z.enum(['TWO_WHEELER', 'FOUR_WHEELER', 'ANY']).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || (user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json(
      { error: 'Forbidden: Only Managing Committee or Super Admin can modify parking spaces' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const validated = updateSpaceSchema.parse(body);

    const updated = ParkingService.updateSpace(
      id,
      {
        displayName: validated.displayName,
        parkingType: validated.parkingType as ParkingType,
        location: validated.location,
        vehicleTypeRestriction: validated.vehicleTypeRestriction as VehicleRestriction,
        isActive: validated.isActive,
        notes: validated.notes,
      },
      user.id
    );

    return NextResponse.json({ success: true, space: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update parking space' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || (user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json(
      { error: 'Forbidden: Only Managing Committee or Super Admin can delete parking spaces' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    ParkingService.removeSpace(id, user.id);
    return NextResponse.json({ success: true, message: 'Parking space removed successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to remove parking space' },
      { status: 400 }
    );
  }
}
