import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DirectoryService } from '@/services/directory.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const verifySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'PENDING']).default('VERIFIED'),
  notes: z.string().optional(),
  policeVerification: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'COMMITTEE' && user.role !== 'COMMITTEE_MEMBER')) {
      return NextResponse.json({ error: 'Unauthorized: Committee or Admin required' }, { status: 403 });
    }

    const { id } = await params;
    let status: 'VERIFIED' | 'REJECTED' | 'PENDING' = 'VERIFIED';
    let notes: string | undefined;
    let policeVerification: boolean | undefined;

    try {
      const body = await request.json();
      const parsed = verifySchema.safeParse(body);
      if (parsed.success) {
        status = parsed.data.status;
        notes = parsed.data.notes;
        policeVerification = parsed.data.policeVerification;
      }
    } catch {
      // Body is optional, default status is VERIFIED
    }

    const updated = DirectoryService.verifyServiceProvider(
      id,
      status,
      notes,
      policeVerification
    );

    return NextResponse.json({
      success: true,
      message: `Service provider status updated to ${status}`,
      provider: updated,
    });
  } catch (error: any) {
    console.error('Error verifying provider:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify provider' },
      { status: 400 }
    );
  }
}
