import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ComplaintService } from '@/services/complaint.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const assignTaskSchema = z.object({
  title: z.string().min(3, 'Task title is required'),
  description: z.string().optional(),
  assignedStaffId: z.string().min(1, 'Target staff member is required'),
  dueDate: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  strategy: z.enum(['MANUAL', 'AUTO', 'HYBRID']).default('MANUAL'),
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

  if (user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: Only Managing Committee can assign tasks' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = assignTaskSchema.parse(body);

    const task = await ComplaintService.assignTask({
      complaintId: id,
      title: validated.title,
      description: validated.description,
      assignedStaffId: validated.assignedStaffId,
      assignedCommitteeId: user.id,
      priority: validated.priority,
      dueDate: validated.dueDate,
      strategy: validated.strategy,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues?.[0]?.message || err.errors?.[0]?.message || err.message || 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message || 'Failed to assign task' }, { status: 400 });
  }
}
