import { NextRequest, NextResponse } from 'next/server';
import { VisitorService } from '@/services/visitor.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || (user.role !== 'GUARD' && user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json(
      { error: 'Forbidden: Only security guards or administrators can confirm physical gate entry' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const updatedVisit = VisitorService.confirmEntry(id, user.id);

    return NextResponse.json({
      success: true,
      message: 'Visitor gate entry confirmed',
      visit: updatedVisit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to confirm visitor entry' },
      { status: 400 }
    );
  }
}
