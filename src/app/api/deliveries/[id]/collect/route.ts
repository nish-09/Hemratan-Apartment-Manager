import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DeliveryService } from '@/services/delivery.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/auth/rbac';

const collectSchema = z.object({
  collectedByName: z.string().min(2, 'Collector name must be at least 2 characters'),
  collectedByResidentId: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || !hasPermission(user.role, PERMISSIONS.DELIVERIES_MANAGE)) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to confirm parcel collection' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const validated = collectSchema.parse(body);

    const updated = DeliveryService.recordCollection(id, {
      collectedByName: validated.collectedByName,
      collectedByResidentId: validated.collectedByResidentId,
      handoverGuardId: user.id,
      notes: validated.notes,
    });

    return NextResponse.json({
      success: true,
      message: `Parcel successfully handed over to ${validated.collectedByName}`,
      delivery: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to record parcel collection' },
      { status: 400 }
    );
  }
}
