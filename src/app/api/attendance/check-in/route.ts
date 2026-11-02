import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DirectoryService } from '@/services/directory.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const checkInSchema = z.object({
  staffId: z.string().min(1, 'Valid staff ID is required for gate check-in'),
  gateNumber: z.string().default('Main Gate 1'),
  remarks: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user || (user.role !== 'GUARD' && user.role !== 'SECURITY_GUARD' && user.role !== 'SUPER_ADMIN' && user.role !== 'COMMITTEE' && user.role !== 'COMMITTEE_MEMBER')) {
      return NextResponse.json({ error: 'Forbidden: Guard or Committee authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const attendanceLog = DirectoryService.recordStaffCheckIn({
      domesticStaffId: parsed.data.staffId,
      guardId: user.id,
      gateName: parsed.data.gateNumber,
      notes: parsed.data.remarks,
    });

    return NextResponse.json(
      {
        success: true,
        attendanceLog,
        message: 'Gate check-in recorded successfully. Worker is now inside.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error recording check-in:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record check-in' },
      { status: 400 }
    );
  }
}
