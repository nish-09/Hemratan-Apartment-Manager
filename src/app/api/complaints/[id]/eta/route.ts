import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ComplaintService } from '@/services/complaint.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const confirmEtaSchema = z.object({
  confirmedEtaDate: z.string().min(1, 'Confirmed ETA date/time is required'),
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
  if (!user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  if (user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: Only Managing Committee can confirm official ETAs' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = confirmEtaSchema.parse(body);

    const updated = await ComplaintService.confirmETA(
      id,
      validated.confirmedEtaDate,
      user.id,
      validated.notes
    );

    return NextResponse.json({ complaint: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Failed to confirm ETA' }, { status: 400 });
  }
}
