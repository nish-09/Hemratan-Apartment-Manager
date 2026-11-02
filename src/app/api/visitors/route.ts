import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VisitorService, AgeRange, VisitStatus } from '@/services/visitor.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, canAccessFlat, PERMISSIONS } from '@/lib/auth/rbac';

const registerVisitorSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  mobileNumber: z.string().min(10, 'Invalid phone number format'),
  ageRange: z.enum(['UNDER_18', '18_TO_30', '31_TO_50', '51_TO_65', 'ABOVE_65']),
  flatId: z.string().min(1, 'Target flat is required'),
  purpose: z.string().min(1, 'Purpose of visit is required'),
  photoData: z
    .object({
      storagePath: z.string(),
      fileSizeBytes: z.number().max(10485760, 'Photograph exceeds 10MB limit'),
      mimeType: z.string(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') as VisitStatus) || undefined;
  const search = searchParams.get('search') || undefined;

  let flatId = searchParams.get('flatId') || undefined;

  // Strict flat-level isolation for RESIDENT role
  if (user.role === 'RESIDENT') {
    const flatIds = user.assignedFlatIds || [];
    if (!flatIds || flatIds.length === 0) {
      return NextResponse.json({ visits: [], currentlyInsideCount: 0 });
    }
    // If query requested specific flat, ensure resident owns it
    if (flatId && !canAccessFlat(user.role, flatIds, flatId)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to view visitors for this flat' },
        { status: 403 }
      );
    }
    // Default to resident's primary flat if not specified
    if (!flatId) {
      flatId = flatIds[0];
    }
  }

  const visits = VisitorService.getVisits({ flatId, status, search });
  const currentlyInsideCount = VisitorService.getCurrentlyInsideVisitors().length;

  return NextResponse.json({
    visits,
    currentlyInsideCount,
  });
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || !hasPermission(user.role, PERMISSIONS.VISITORS_REGISTER)) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to register visitors' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = registerVisitorSchema.parse(body);

    // If resident is registering a visitor (pre-approval), ensure it is for their own flat
    const flatIds = user.assignedFlatIds || [];
    if (user.role === 'RESIDENT' && !canAccessFlat(user.role, flatIds, validated.flatId)) {
      return NextResponse.json(
        { error: 'Forbidden: Residents may only register visitors for their own flat' },
        { status: 403 }
      );
    }

    const { visit, rawOtp } = await VisitorService.registerVisitor({
      fullName: validated.fullName,
      mobileNumber: validated.mobileNumber,
      ageRange: validated.ageRange as AgeRange,
      photoData: validated.photoData,
      flatId: validated.flatId,
      guardId: user.role === 'GUARD' ? user.id : undefined,
      purpose: validated.purpose,
    });

    // In development or demo mode, expose rawOtp for immediate testing and verification
    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json(
      {
        success: true,
        visit,
        ...(isDev ? { rawOtp } : {}),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to register visitor' },
      { status: 400 }
    );
  }
}
