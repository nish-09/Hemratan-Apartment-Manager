import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DirectoryService } from '@/services/directory.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const accessContactSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required to view provider contacts' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { id } = await params;
    let reason: string | undefined;
    try {
      const body = await request.json();
      const parsed = accessContactSchema.safeParse(body);
      if (parsed.success) {
        reason = parsed.data.reason;
      }
    } catch {
      // Body is optional
    }

    const result = DirectoryService.accessProviderContact({
      serviceProviderId: id,
      userProfileId: user.id,
      userName: user.fullName || user.email,
      flatId: user.assignedFlatIds?.[0],
      reason,
    });

    const provider = DirectoryService.getProviderById(id);

    return NextResponse.json({
      success: true,
      providerId: id,
      fullName: provider?.fullName,
      phone: result.fullPhoneNumber,
      category: provider?.category,
      auditLogId: result.auditLogId,
      accessLoggedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error accessing contact:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to access contact number' },
      { status: 400 }
    );
  }
}
