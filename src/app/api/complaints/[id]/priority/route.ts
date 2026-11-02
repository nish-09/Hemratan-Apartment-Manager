import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ComplaintService } from '@/services/complaint.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const overrideSchema = z.object({
  newPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  reason: z.string().min(8, 'Mandatory reason must be at least 8 characters long'),
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
  if (!user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  if (user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: Only Managing Committee or Super Admin can override priority' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = overrideSchema.parse(body);

    const updated = await ComplaintService.overridePriority(
      id,
      validated.newPriority,
      validated.reason,
      user.id
    );

    return NextResponse.json({ complaint: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues?.[0]?.message || err.errors?.[0]?.message || err.message || 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message || 'Failed to override priority' }, { status: 400 });
  }
}
