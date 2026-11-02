import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getDeliveriesHandler, POST as registerDeliveryHandler } from './route';
import { POST as updateStatusHandler } from './[id]/status/route';
import { POST as collectHandler } from './[id]/collect/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { DeliveryService } from '@/services/delivery.service';

describe('Delivery Management API Endpoints', () => {
  let guardToken: string;
  let residentToken: string;
  const sampleFlatId = 'flat-a-402'; // Resident Jonathan Patel's flat
  const otherFlatId = 'flat-a-101';

  beforeEach(() => {
    DeliveryService.resetStore();
    guardToken = createSessionToken('guard@hemratan.com')!.token;
    residentToken = createSessionToken('resident@hemratan.com')!.token;
  });

  describe('GET /api/deliveries (with Flat-Level Isolation)', () => {
    it('returns 401 unauthenticated without session cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/deliveries');
      const res = await getDeliveriesHandler(req);
      expect(res.status).toBe(401);
    });

    it('enforces flat-level isolation: RESIDENT only sees parcels for their flat', async () => {
      const req = new NextRequest('http://localhost:3000/api/deliveries', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });

      const res = await getDeliveriesHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.deliveries)).toBe(true);

      for (const del of data.deliveries) {
        expect(del.flatId).toBe(sampleFlatId);
      }
    });

    it('allows GUARD to view society-wide parcels and metrics overview', async () => {
      const req = new NextRequest('http://localhost:3000/api/deliveries', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });

      const res = await getDeliveriesHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.deliveries.length).toBeGreaterThanOrEqual(2);
      expect(data.overview).toBeDefined();
      expect(data.overview.totalDeliveries).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/deliveries (Registration)', () => {
    it('allows GUARD to register delivery and dispatch in-app resident alert', async () => {
      const req = new NextRequest('http://localhost:3000/api/deliveries', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'Amazon',
          trackingNumber: 'TBA000111222',
          recipientName: 'Jonathan Patel',
          flatId: sampleFlatId,
          category: 'ECOMMERCE',
          packageDescription: 'Medium package',
        }),
      });

      const res = await registerDeliveryHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.delivery.provider).toBe('Amazon');
      expect(data.notification).toBeDefined();
      expect(data.notification.flatId).toBe(sampleFlatId);
    });

    it('prevents RESIDENT from registering gate parcels', async () => {
      const req = new NextRequest('http://localhost:3000/api/deliveries', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'Amazon',
          recipientName: 'Jonathan Patel',
          flatId: sampleFlatId,
          category: 'ECOMMERCE',
        }),
      });

      const res = await registerDeliveryHandler(req);
      expect(res.status).toBe(403);
    });
  });

  describe('Delivery Handover & Collection Lifecycle', () => {
    it('executes status progression and secure collection with recorded recipient', async () => {
      // 1. Register parcel
      const regReq = new NextRequest('http://localhost:3000/api/deliveries', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'Swiggy',
          recipientName: 'Jonathan Patel',
          flatId: sampleFlatId,
          category: 'FOOD',
        }),
      });

      const regRes = await registerDeliveryHandler(regReq);
      const regData = await regRes.json();
      const deliveryId = regData.delivery.id;
      const paramsPromise = Promise.resolve({ id: deliveryId });

      // 2. Mark READY_FOR_COLLECTION
      const statusReq = new NextRequest(`http://localhost:3000/api/deliveries/${deliveryId}/status`, {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status: 'READY_FOR_COLLECTION', notes: 'Placed on Food Rack' }),
      });

      const statusRes = await updateStatusHandler(statusReq, { params: paramsPromise });
      expect(statusRes.status).toBe(200);

      // 3. Confirm handover/collection with collector name
      const collectReq = new NextRequest(`http://localhost:3000/api/deliveries/${deliveryId}/collect`, {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          collectedByName: 'Jonathan Patel',
          notes: 'Handed over in person',
        }),
      });

      const collectRes = await collectHandler(collectReq, { params: paramsPromise });
      expect(collectRes.status).toBe(200);
      const collectData = await collectRes.json();
      expect(collectData.delivery.status).toBe('COLLECTED');
      expect(collectData.delivery.collectedByName).toBe('Jonathan Patel');

      // 4. Duplicate collection attempt fails
      const dupCollectReq = new NextRequest(`http://localhost:3000/api/deliveries/${deliveryId}/collect`, {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          collectedByName: 'Imposter Neighbor',
        }),
      });

      const dupCollectRes = await collectHandler(dupCollectReq, { params: paramsPromise });
      expect(dupCollectRes.status).toBe(400);
      const dupData = await dupCollectRes.json();
      expect(dupData.error).toContain('already been collected');
    });
  });
});
