import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ParkingService, VehicleType, AllocationStatus } from '@/services/parking.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/auth/rbac';

const allocateSchema = z.object({
  parkingSpaceId: z.string().min(1, 'Parking space ID is required'),
  vehicleNumber: z.string().min(4, 'Valid vehicle registration plate number is required'),
  vehicleType: z.enum(['TWO_WHEELER', 'FOUR_WHEELER']),
  visitId: z.string().optional(),
  flatId: z.string().optional(),
  expectedDurationMinutes: z.number().int().positive().optional(),
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

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') as AllocationStatus) || undefined;
  const vehicleNumber = searchParams.get('vehicleNumber') || undefined;
  let flatId = searchParams.get('flatId') || undefined;

  // Enforce flat isolation for residents
  if (user.role === 'RESIDENT') {
    const userFlats = user.assignedFlatIds || [];
    if (userFlats.length === 0) {
      return NextResponse.json({ allocations: [] });
    }
    if (flatId && !userFlats.includes(flatId)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to view parking allocations for this flat' },
        { status: 403 }
      );
    }
    if (!flatId) {
      flatId = userFlats[0];
    }
  }

  const allocations = ParkingService.getAllocations({ status, flatId, vehicleNumber });

  return NextResponse.json({ allocations });
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || !hasPermission(user.role, PERMISSIONS.PARKING_MANAGE)) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to allocate society parking' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = allocateSchema.parse(body);

    const allocation = ParkingService.allocateParking({
      parkingSpaceId: validated.parkingSpaceId,
      vehicleNumber: validated.vehicleNumber,
      vehicleType: validated.vehicleType as VehicleType,
      visitId: validated.visitId,
      flatId: validated.flatId,
      guardId: user.id,
      expectedDurationMinutes: validated.expectedDurationMinutes,
      notes: validated.notes,
    });

    return NextResponse.json({ success: true, allocation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to allocate parking space' },
      { status: 400 }
    );
  }
}
