import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ComplaintService } from '@/services/complaint.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const submitComplaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum([
    'PLUMBING',
    'ELECTRICAL',
    'LIFT',
    'HOUSEKEEPING',
    'SECURITY',
    'PARKING',
    'NOISE',
    'STRUCTURAL',
    'AMENITIES',
    'OTHER',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedFlatsCount: z.number().int().min(1).default(1),
  propertyDamage: z.boolean().default(false),
  recurrence: z.boolean().default(false),
  safetyOverrideType: z
    .enum(['FIRE_EMERGENCY', 'ELECTRICAL_HAZARD', 'LIFT_ENTRAPMENT', 'STRUCTURAL_COLLAPSE_RISK'])
    .optional(),
  isAnonymous: z.boolean().default(false),
  flatId: z.string().optional(),
  media: z
    .array(
      z.object({
        fileType: z.enum(['IMAGE', 'VIDEO']),
        originalFileName: z.string(),
        fileSizeBytes: z.number().int().positive(),
        mimeType: z.string(),
      })
    )
    .optional(),
});

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    let complaints;
    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      complaints = await ComplaintService.getComplaintsForResident(user.id, userFlats);
    } else {
      // Committee, Super Admin, Guard
      complaints = await ComplaintService.getComplaintsForCommittee();
    }

    const metrics = ComplaintService.getMetrics();
    return NextResponse.json({ complaints, metrics });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list complaints' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = submitComplaintSchema.parse(body);

    // If resident and not anonymous, verify flat ownership
    let effectiveFlatId = validated.flatId;
    if (user.role === 'RESIDENT' && !validated.isAnonymous) {
      const userFlats = user.assignedFlatIds || [];
      if (userFlats.length > 0) {
        effectiveFlatId = effectiveFlatId || userFlats[0];
        if (!userFlats.includes(effectiveFlatId)) {
          return NextResponse.json(
            { error: 'Forbidden: You cannot submit non-anonymous complaints for another flat' },
            { status: 403 }
          );
        }
      }
    }

    const complaint = await ComplaintService.submitComplaint({
      ...validated,
      flatId: effectiveFlatId,
      complainantProfileId: user.id,
      complainantName: user.fullName,
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues?.[0]?.message || err.errors?.[0]?.message || err.message || 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message || 'Failed to submit complaint' }, { status: 400 });
  }
}
