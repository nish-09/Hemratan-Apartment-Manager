import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { AnalyticsService, AnalyticsRange } from '@/services/analytics.service';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Role check: Only Committee and Super Admin can view society-wide analytics
    if (user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Society-wide analytics are restricted to Managing Committee and Super Admin' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get('range') as AnalyticsRange) || '30D';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const wing = searchParams.get('wing') || undefined;

    const data = await AnalyticsService.getSocietyWideAnalytics({
      range,
      startDate,
      endDate,
      wing,
    });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
