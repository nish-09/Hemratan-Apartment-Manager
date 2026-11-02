import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getSpacesHandler, POST as createSpaceHandler } from './spaces/route';
import { PATCH as updateSpaceHandler, DELETE as deleteSpaceHandler } from './spaces/[id]/route';
import { GET as getAvailabilityHandler } from './availability/route';
import { GET as getAllocationsHandler, POST as allocateHandler } from './allocations/route';
import { POST as checkoutAllocationHandler } from './allocations/[id]/checkout/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { ParkingService } from '@/services/parking.service';

describe('Parking Management API Endpoints', () => {
  let guardToken: string;
  let committeeToken: string;
  let residentToken: string;

  beforeEach(() => {
    ParkingService.resetStore();
    guardToken = createSessionToken('guard@hemratan.com')!.token;
    committeeToken = createSessionToken('committee@hemratan.com')!.token;
    residentToken = createSessionToken('resident@hemratan.com')!.token;
  });

  describe('Parking Spaces Configuration', () => {
    it('returns 401 unauthenticated for spaces list', async () => {
      const req = new NextRequest('http://localhost:3000/api/parking/spaces');
      const res = await getSpacesHandler(req);
      expect(res.status).toBe(401);
    });

    it('allows authenticated users to view parking spaces', async () => {
      const req = new NextRequest('http://localhost:3000/api/parking/spaces', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const res = await getSpacesHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.spaces).toHaveLength(5);
    });

    it('prevents Guard from creating new parking spaces (Committee-only)', async () => {
      const req = new NextRequest('http://localhost:3000/api/parking/spaces', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ displayName: 'P99' }),
      });
      const res = await createSpaceHandler(req);
      expect(res.status).toBe(403);
    });

    it('allows Committee to add a new parking space (dynamic capacity)', async () => {
      const req = new NextRequest('http://localhost:3000/api/parking/spaces', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          displayName: 'P6',
          location: 'East Wing Basement',
          vehicleTypeRestriction: 'FOUR_WHEELER',
        }),
      });
      const res = await createSpaceHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.space.displayName).toBe('P6');
    });

    it('allows Committee to update space details', async () => {
      const p1 = ParkingService.getSpaces()[0];
      const paramsPromise = Promise.resolve({ id: p1.id });

      const req = new NextRequest(`http://localhost:3000/api/parking/spaces/${p1.id}`, {
        method: 'PATCH',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ location: 'Gate 1 VIP Bay' }),
      });

      const res = await updateSpaceHandler(req, { params: paramsPromise });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.space.location).toBe('Gate 1 VIP Bay');
    });
  });

  describe('Availability & Allocations Lifecycle', () => {
    it('returns availability metrics overview', async () => {
      const req = new NextRequest('http://localhost:3000/api/parking/availability', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const res = await getAvailabilityHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalSpaces).toBe(5);
      expect(data.availableSpaces).toBe(5);
      expect(data.occupiedSpaces).toBe(0);
    });

    it('allows Guard to allocate a space and prevents double allocation', async () => {
      const p1 = ParkingService.getSpaces()[0];

      // 1. First allocation succeeds
      const req1 = new NextRequest('http://localhost:3000/api/parking/allocations', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          parkingSpaceId: p1.id,
          vehicleNumber: 'MH02AA1111',
          vehicleType: 'FOUR_WHEELER',
          flatId: 'flat-a-402',
          expectedDurationMinutes: 120,
        }),
      });

      const res1 = await allocateHandler(req1);
      expect(res1.status).toBe(201);
      const data1 = await res1.json();
      expect(data1.allocation.status).toBe('ACTIVE');
      const allocId = data1.allocation.id;

      // 2. Second allocation on SAME space fails (concurrency check)
      const req2 = new NextRequest('http://localhost:3000/api/parking/allocations', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          parkingSpaceId: p1.id,
          vehicleNumber: 'MH02BB2222',
          vehicleType: 'FOUR_WHEELER',
        }),
      });

      const res2 = await allocateHandler(req2);
      expect(res2.status).toBe(400);
      const data2 = await res2.json();
      expect(data2.error).toContain('already occupied');

      // 3. Checkout releases space
      const checkoutReq = new NextRequest(`http://localhost:3000/api/parking/allocations/${allocId}/checkout`, {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });

      const checkoutRes = await checkoutAllocationHandler(checkoutReq, {
        params: Promise.resolve({ id: allocId }),
      });
      expect(checkoutRes.status).toBe(200);
      const checkoutData = await checkoutRes.json();
      expect(checkoutData.allocation.status).toBe('COMPLETED');
    });

    it('enforces flat-level isolation for residents viewing parking records', async () => {
      const p1 = ParkingService.getSpaces()[0];
      const p2 = ParkingService.getSpaces()[1];

      // Resident Jonathan Patel owns flat-a-402
      ParkingService.allocateParking({
        parkingSpaceId: p1.id,
        vehicleNumber: 'MH02OWNER',
        vehicleType: 'FOUR_WHEELER',
        flatId: 'flat-a-402',
      });

      // Another flat's parking
      ParkingService.allocateParking({
        parkingSpaceId: p2.id,
        vehicleNumber: 'MH02OTHER',
        vehicleType: 'FOUR_WHEELER',
        flatId: 'flat-b-102',
      });

      const req = new NextRequest('http://localhost:3000/api/parking/allocations', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });

      const res = await getAllocationsHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.allocations).toHaveLength(1);
      expect(data.allocations[0].flatId).toBe('flat-a-402');
    });
  });
});
