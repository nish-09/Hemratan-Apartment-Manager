import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DeliveryService, DeliveryStatus } from '@/services/delivery.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/auth/rbac';

const updateStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'NOTIFIED', 'READY_FOR_COLLECTION', 'RETURNED', 'CANCELLED']),
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
      { error: 'Forbidden: You do not have permission to update delivery status' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const validated = updateStatusSchema.parse(body);

    const updated = DeliveryService.updateStatus(
      id,
      validated.status as DeliveryStatus,
      user.id,
      validated.notes
    );

    return NextResponse.json({
      success: true,
      message: `Delivery status updated to ${validated.status}`,
      delivery: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update delivery status' },
      { status: 400 }
    );
  }
}
