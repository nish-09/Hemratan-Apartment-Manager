import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { ReportsService, ReportType } from '@/services/reports.service';

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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as ReportType;
    if (!type) {
      return NextResponse.json({ error: 'Missing required query parameter "type"' }, { status: 400 });
    }

    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const wing = searchParams.get('wing') || undefined;
    const flatId = searchParams.get('flatId') || undefined;

    const report = await ReportsService.generateReport(
      type,
      { startDate, endDate, wing, flatId },
      {
        role: user.role,
        flatIds: user.flatIds,
        profileId: user.id,
      }
    );

    return NextResponse.json({ report });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    const status = errorMsg.includes('Forbidden') ? 403 : errorMsg.includes('not supported') ? 400 : 500;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
