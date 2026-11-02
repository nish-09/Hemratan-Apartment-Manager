import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ComplaintService } from '@/services/complaint.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const revealSchema = z.object({
  legalReason: z
    .string()
    .min(15, 'A mandatory legal/operational justification (min 15 characters) is required'),
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
  if (!user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  if (user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: Exclusively Super Admin can reveal anonymous complainant identity' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = revealSchema.parse(body);

    const identity = await ComplaintService.revealAnonymousIdentity(
      id,
      user.id,
      validated.legalReason
    );

    return NextResponse.json({ identity });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message || 'Failed to reveal identity' }, { status: 400 });
  }
}
