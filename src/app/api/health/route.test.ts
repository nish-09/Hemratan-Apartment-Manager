import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('Health Check API Endpoint', () => {
  it('returns HTTP 200 with healthy status', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('Hemratan Apartment Manager API');
    expect(typeof body.uptime).toBe('number');
    expect(body.checks.serverless).toBe('ok');
  });
});
