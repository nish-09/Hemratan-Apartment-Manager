import { NextRequest, NextResponse } from 'next/server';
import { VisitorService } from '@/services/visitor.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/auth/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || !hasPermission(user.role, PERMISSIONS.VISITORS_CHECKOUT)) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to check out visitors' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const updatedVisit = VisitorService.confirmExit(id);

    return NextResponse.json({
      success: true,
      message: 'Visitor departure confirmed',
      visit: updatedVisit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to check out visitor' },
      { status: 400 }
    );
  }
}
