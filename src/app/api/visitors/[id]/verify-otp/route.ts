import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VisitorService } from '@/services/visitor.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const verifyOtpSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
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

  const { id } = await params;

  try {
    const body = await request.json();
    const { otp } = verifyOtpSchema.parse(body);

    const result = VisitorService.verifyOtp(id, otp);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          remainingAttempts: result.remainingAttempts,
        },
        { status: 400 }
      );
    }

    const updatedVisit = VisitorService.getVisitById(id);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      visit: updatedVisit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to verify OTP' },
      { status: 400 }
    );
  }
}
