import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SocietyService } from '@/services/society.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/auth/rbac';

const createFlatSchema = z.object({
  wing: z.string().min(1).max(10),
  flatNumber: z.string().min(1).max(10),
  floor: z.number().int().min(0),
  areaSqFt: z.number().positive(),
  intercomNumber: z.string().min(1),
  isOccupied: z.boolean().default(false),
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

  const { searchParams } = new URL(request.url);
  const wing = searchParams.get('wing') || undefined;
  const search = searchParams.get('search') || undefined;
  const isOccupiedParam = searchParams.get('isOccupied');
  const isOccupied = isOccupiedParam !== null ? isOccupiedParam === 'true' : undefined;

  const flats = SocietyService.getFlats({ wing, search, isOccupied });
  const overview = SocietyService.getSocietyOverview();

  return NextResponse.json({
    overview,
    flats,
  });
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || !hasPermission(user.role, PERMISSIONS.FLATS_MANAGE)) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to manage society flats' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = createFlatSchema.parse(body);
    const newFlat = SocietyService.createFlat(validated);

    return NextResponse.json({ success: true, flat: newFlat }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create flat' },
      { status: 400 }
    );
  }
}
