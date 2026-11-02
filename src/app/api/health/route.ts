import { NextResponse } from 'next/server';
import { env } from '@/lib/env';


export async function GET() {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '0.1.0',
    service: 'Hemratan Apartment Manager API',
    checks: {
      serverless: 'ok',
      timestampUtc: Date.now(),
    },
  };

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
