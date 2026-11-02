import { NextRequest, NextResponse } from 'next/server';
import { DirectoryService } from '@/services/directory.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

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

    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      if (userFlats.length === 0) {
        return NextResponse.json({ staff: [], recentAttendance: [], total: 0 });
      }

      // Aggregate across all flats owned by resident
      const workersMap = new Map();
      const attendanceLogs: any[] = [];

      for (const flatId of userFlats) {
        const { workers, recentAttendance } = DirectoryService.getDomesticStaffForResident(flatId);
        for (const w of workers) {
          workersMap.set(w.id, w);
        }
        attendanceLogs.push(...recentAttendance);
      }

      const staff = Array.from(workersMap.values());
      return NextResponse.json({
        staff,
        recentAttendance: attendanceLogs,
        total: staff.length,
      });
    }

    // Committee / Guard / Super Admin
    const staff = DirectoryService.getAllDomesticStaff();
    return NextResponse.json({
      staff,
      total: staff.length,
    });
  } catch (error) {
    console.error('Error fetching resident domestic staff:', error);
    return NextResponse.json({ error: 'Failed to fetch domestic staff' }, { status: 500 });
  }
}
