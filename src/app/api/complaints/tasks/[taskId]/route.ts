import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ComplaintService } from '@/services/complaint.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const progressSchema = z.object({
  statusUpdate: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED']),
  notes: z.string().min(5, 'Progress note must be at least 5 characters'),
  evidencePhotoPath: z.string().optional(),
  resolutionNotes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const { taskId } = await params;
    const body = await request.json();
    const validated = progressSchema.parse(body);

    const updatedTask = await ComplaintService.updateTaskProgress(taskId, {
      statusUpdate: validated.statusUpdate,
      notes: validated.notes,
      updatedByUserId: user.id,
      evidencePhotoPath: validated.evidencePhotoPath,
      resolutionNotes: validated.resolutionNotes,
    });

    return NextResponse.json({ task: updatedTask });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message || 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Failed to update task progress' }, { status: 400 });
  }
}
