import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DirectoryService } from '@/services/directory.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const consentSchema = z.object({
  withdraw: z.boolean(),
  reason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = consentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const isListingActive = !parsed.data.withdraw;
    const updated = DirectoryService.setProviderConsent(id, isListingActive);

    return NextResponse.json({
      success: true,
      message: isListingActive
        ? 'Consent restored and listing active.'
        : 'Consent withdrawn successfully. Listing removed from directory.',
      provider: updated,
    });
  } catch (error: any) {
    console.error('Error updating consent:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update consent' },
      { status: 400 }
    );
  }
}
