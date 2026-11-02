import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VisitorService } from '@/services/visitor.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, canAccessFlat, PERMISSIONS } from '@/lib/auth/rbac';

const approveSchema = z.object({
  channel: z.enum(['GODREJ_INTERCOM', 'RESIDENT_APP', 'COMMITTEE_CLEARANCE']),
  status: z.enum(['APPROVED', 'REJECTED']),
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
  if (!user || !hasPermission(user.role, PERMISSIONS.VISITORS_APPROVE)) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to approve visitor entry' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const visit = VisitorService.getVisitById(id);
  if (!visit) {
    return NextResponse.json({ error: 'Visit record not found' }, { status: 404 });
  }

  // Resident check: can only approve visitors for their own flat
  const flatIds = user.assignedFlatIds || [];
  if (user.role === 'RESIDENT' && !canAccessFlat(user.role, flatIds, visit.flatId)) {
    return NextResponse.json(
      { error: 'Forbidden: You may only approve visitors visiting your flat' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = approveSchema.parse(body);

    const updatedVisit = VisitorService.recordApproval(id, {
      channel: validated.channel,
      status: validated.status,
      notes: validated.notes,
    });

    return NextResponse.json({
      success: true,
      message: `Visit ${validated.status.toLowerCase()} via ${validated.channel}`,
      visit: updatedVisit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to record approval' },
      { status: 400 }
    );
  }
}
