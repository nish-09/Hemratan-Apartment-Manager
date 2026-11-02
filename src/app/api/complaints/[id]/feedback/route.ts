import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ComplaintService } from '@/services/complaint.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedbackComments: z.string().optional(),
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

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = feedbackSchema.parse(body);

    const feedback = await ComplaintService.submitFeedback(
      id,
      validated.rating,
      validated.feedbackComments
    );

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message || 'Failed to submit feedback' }, { status: 400 });
  }
}
