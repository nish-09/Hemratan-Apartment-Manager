import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DirectoryService } from '@/services/directory.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const authorizeStaffSchema = z.object({
  staffId: z.string().min(1, 'Valid staff ID required'),
  flatId: z.string().min(1, 'Valid flat ID required'),
  flatNumber: z.string().optional(),
  wing: z.string().optional(),
  morningSlot: z.boolean().default(true),
  eveningSlot: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = authorizeStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    // Residents can only authorize for their own flat(s)
    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      if (!userFlats.includes(parsed.data.flatId)) {
        return NextResponse.json(
          { error: 'Forbidden: You can only authorize domestic help for your own flat' },
          { status: 403 }
        );
      }
    }

    const authorization = DirectoryService.authorizeFlat({
      domesticStaffId: parsed.data.staffId,
      flatId: parsed.data.flatId,
      flatNumber: parsed.data.flatNumber || '402',
      wing: parsed.data.wing || 'A',
      authorizedByProfileId: user.id,
      morningSlot: parsed.data.morningSlot,
      eveningSlot: parsed.data.eveningSlot,
    });

    return NextResponse.json(
      {
        success: true,
        authorization,
        message: 'Domestic staff authorized for flat access',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error authorizing staff for flat:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to authorize domestic staff for flat' },
      { status: 400 }
    );
  }
}
