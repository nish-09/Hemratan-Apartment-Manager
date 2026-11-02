import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DeliveryService, DeliveryCategory, DeliveryStatus } from '@/services/delivery.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/auth/rbac';

const registerDeliverySchema = z.object({
  provider: z.string().min(2, 'Provider name must be at least 2 characters'),
  trackingNumber: z.string().optional(),
  recipientName: z.string().min(2, 'Recipient name must be at least 2 characters'),
  flatId: z.string().min(1, 'Target flat is required'),
  category: z.enum(['FOOD', 'GROCERY', 'COURIER', 'ECOMMERCE', 'DOCUMENTS', 'OTHER']),
  packageDescription: z.string().optional(),
  packagePhotoData: z
    .object({
      storagePath: z.string(),
      fileSizeBytes: z.number().max(10485760, 'Photograph exceeds 10MB limit'),
      mimeType: z.string(),
    })
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

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get('status') as DeliveryStatus) || undefined;
  const category = (searchParams.get('category') as DeliveryCategory) || undefined;
  const search = searchParams.get('search') || undefined;
  let flatId = searchParams.get('flatId') || undefined;

  // Strict flat-level isolation for RESIDENT role
  if (user.role === 'RESIDENT') {
    const userFlats = user.assignedFlatIds || [];
    if (userFlats.length === 0) {
      return NextResponse.json({ deliveries: [], overview: null, notifications: [] });
    }
    if (flatId && !userFlats.includes(flatId)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to view parcels for this flat' },
        { status: 403 }
      );
    }
    if (!flatId) {
      flatId = userFlats[0];
    }
  }

  const deliveries = DeliveryService.getDeliveries({ flatId, status, category, search });
  const overview = DeliveryService.getDeliveryOverview();
  const notifications = flatId ? DeliveryService.getNotificationsForFlat(flatId) : [];

  return NextResponse.json({
    deliveries,
    overview,
    notifications,
  });
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const user = getAuthenticatedUser(sessionCookie.value);
  if (!user || !hasPermission(user.role, PERMISSIONS.DELIVERIES_MANAGE)) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permission to register incoming deliveries' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = registerDeliverySchema.parse(body);

    const { delivery, notification } = DeliveryService.registerDelivery({
      provider: validated.provider,
      trackingNumber: validated.trackingNumber,
      recipientName: validated.recipientName,
      flatId: validated.flatId,
      category: validated.category as DeliveryCategory,
      packageDescription: validated.packageDescription,
      packagePhotoData: validated.packagePhotoData,
      receivedByGuardId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Delivery registered and in-app resident alert dispatched',
        delivery,
        notification,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to register delivery' },
      { status: 400 }
    );
  }
}
