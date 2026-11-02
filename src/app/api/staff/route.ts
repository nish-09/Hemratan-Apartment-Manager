import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DirectoryService, DomesticServiceType } from '@/services/directory.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const registerStaffSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  roleTitle: z.enum(['MAID', 'COOK', 'DRIVER', 'BABYSITTER', 'ELDERCARE', 'CLEANER', 'OTHER']).default('MAID'),
  profilePhotoPath: z.string().optional(),
  emergencyContact: z.string().optional(),
  initialFlatId: z.string().optional(),
});

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

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const activeOnly = url.searchParams.get('activeOnly') !== 'false';

    let staffList = DirectoryService.getAllDomesticStaff();

    if (activeOnly) {
      staffList = staffList.filter((s) => s.isActive);
    }

    if (search) {
      staffList = staffList.filter(
        (s) =>
          s.fullName.toLowerCase().includes(search) ||
          s.serviceType.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      staff: staffList,
      total: staffList.length,
    });
  } catch (error) {
    console.error('Error fetching domestic staff:', error);
    return NextResponse.json({ error: 'Failed to fetch domestic staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = registerStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const staff = DirectoryService.registerDomesticWorker({
      fullName: parsed.data.fullName,
      serviceType: parsed.data.roleTitle as DomesticServiceType,
      phoneNumber: parsed.data.phone,
      emergencyContact: parsed.data.emergencyContact,
      profilePhotoPath: parsed.data.profilePhotoPath,
      initialFlatId: parsed.data.initialFlatId,
    });

    return NextResponse.json(
      {
        success: true,
        staff,
        message: 'Domestic staff profile registered successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering domestic staff:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to register domestic staff' },
      { status: 400 }
    );
  }
}
