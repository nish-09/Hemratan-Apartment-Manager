import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { SocietyService } from './society.service';
import { GET as getFlatsHandler, POST as postFlatsHandler } from '@/app/api/flats/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

describe('Society Flats Service & API', () => {
  it('retrieves society overview with accurate calculations', () => {
    const overview = SocietyService.getSocietyOverview();
    expect(overview.buildingName).toBe('Hemratan Apartments');
    expect(overview.totalFlats).toBeGreaterThanOrEqual(100);
    expect(overview.occupiedFlats).toBeGreaterThan(0);
    expect(overview.occupancyPercentage).toBeGreaterThan(0);
  });

  it('filters flats by wing and search query', () => {
    const wingAFlats = SocietyService.getFlats({ wing: 'A' });
    expect(wingAFlats.length).toBeGreaterThan(0);
    expect(wingAFlats.every((f) => f.wing === 'A')).toBe(true);

    const searched = SocietyService.getFlats({ search: 'Jonathan' });
    expect(searched.length).toBeGreaterThan(0);
    expect(searched[0].flatNumber).toBe('402');
  });

  it('allows authenticated resident to read society flats list via GET /api/flats', async () => {
    const session = createSessionToken('resident@hemratan.com');
    const req = new NextRequest('http://localhost:3000/api/flats?wing=A', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${session!.token}`,
      },
    });

    const res = await getFlatsHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.overview).toBeDefined();
    expect(body.flats.length).toBeGreaterThan(0);
  });

  it('denies resident from creating new flats (403 Forbidden)', async () => {
    const session = createSessionToken('resident@hemratan.com');
    const req = new NextRequest('http://localhost:3000/api/flats', {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${session!.token}`,
      },
      body: JSON.stringify({
        wing: 'E',
        flatNumber: '999',
        floor: 9,
        areaSqFt: 1200,
        intercomNumber: '9999',
      }),
    });

    const res = await postFlatsHandler(req);
    expect(res.status).toBe(403);
  });

  it('allows Committee member to create a new flat (201 Created)', async () => {
    const session = createSessionToken('committee@hemratan.com');
    const req = new NextRequest('http://localhost:3000/api/flats', {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${session!.token}`,
      },
      body: JSON.stringify({
        wing: 'E',
        flatNumber: '101',
        floor: 1,
        areaSqFt: 1350,
        intercomNumber: '5101',
      }),
    });

    const res = await postFlatsHandler(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.flat.flatNumber).toBe('101');
  });
});
