import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DirectoryService, DirectoryCategory } from '@/services/directory.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const registerProviderSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  category: z.enum([
    'PLUMBER',
    'ELECTRICIAN',
    'HOUSEKEEPING',
    'DOMESTIC_HELP',
    'COOK',
    'MAID',
    'DRIVER',
    'CARPENTER',
    'PAINTER',
    'LIFT_MAINTENANCE',
    'SECURITY',
    'OTHER',
  ]),
  serviceName: z.string().optional(),
  bio: z.string().optional(),
  languages: z.string().default('Hindi, English'),
  workingHours: z.string().default('09:00 AM - 06:00 PM'),
  emergencyAvailable: z.boolean().default(false),
  idProofType: z.string().optional(),
  idProofNumber: z.string().optional(),
  policeVerificationDocUrl: z.string().optional(),
  consentGiven: z.boolean().refine((val) => val === true, {
    message: 'Explicit worker consent is mandatory for directory listing',
  }),
});

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    const user = sessionCookie?.value ? getAuthenticatedUser(sessionCookie.value) : null;

    const url = new URL(request.url);
    const category = url.searchParams.get('category') as DirectoryCategory | null;
    const search = url.searchParams.get('search') || undefined;
    const includeAll = url.searchParams.get('includeAll') === 'true';

    // Residents, guards, or public get masked phones and active verified only.
    // SuperAdmin or Committee can view pending verification or inactive when includeAll is true.
    const isCommitteeOrAdmin = !!user && (user.role === 'SUPER_ADMIN' || user.role === 'COMMITTEE');

    const providers = DirectoryService.getDirectory({
      category: category || undefined,
      search,
      verifiedOnly: !isCommitteeOrAdmin || !includeAll,
      includeInactive: isCommitteeOrAdmin && includeAll,
      maskPhone: !isCommitteeOrAdmin,
    });

    return NextResponse.json({
      providers,
      total: providers.length,
    });
  } catch (error) {
    console.error('Error fetching directory providers:', error);
    return NextResponse.json({ error: 'Failed to fetch directory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    const user = sessionCookie?.value ? getAuthenticatedUser(sessionCookie.value) : null;

    const body = await request.json();
    const parsed = registerProviderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const isDirectlyVerified = !!user && (user.role === 'SUPER_ADMIN' || user.role === 'COMMITTEE');

    const provider = DirectoryService.registerServiceProvider({
      fullName: parsed.data.fullName,
      category: parsed.data.category as DirectoryCategory,
      phoneNumber: parsed.data.phone,
      bio: parsed.data.bio,
      languages: parsed.data.languages,
      workingHours: parsed.data.workingHours,
      idProofType: parsed.data.idProofType,
      idProofNumberMasked: parsed.data.idProofNumber ? `XXXX-XXXX-${parsed.data.idProofNumber.slice(-4)}` : undefined,
      verificationStatus: isDirectlyVerified ? 'VERIFIED' : 'PENDING',
      consentGiven: parsed.data.consentGiven,
    });

    return NextResponse.json(
      {
        success: true,
        provider,
        message: isDirectlyVerified
          ? 'Service provider registered and verified'
          : 'Service provider registered and pending committee verification',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering service provider:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to register service provider' },
      { status: 400 }
    );
  }
}
