import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginHandler } from './login/route';
import { POST as logoutHandler } from './logout/route';
import { GET as meHandler } from './me/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

describe('Auth API Handlers', () => {
  it('logs in Resident with valid credentials and sets session cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'resident@hemratan.com', password: 'password123' }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.role).toBe('RESIDENT');
    expect(data.redirectUrl).toBe('/resident/dashboard');

    const setCookie = res.cookies.get(SESSION_COOKIE_NAME);
    expect(setCookie).toBeDefined();
    expect(setCookie?.value).toBeTruthy();
  });

  it('logs in Guard and redirects to /guard/dashboard', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'guard@hemratan.com', password: 'password123' }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user.role).toBe('GUARD');
    expect(data.redirectUrl).toBe('/guard/dashboard');
  });

  it('rejects unknown email with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'unknown@example.com', password: 'password123' }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);
  });

  it('clears session cookie on logout', async () => {
    const res = await logoutHandler();
    expect(res.status).toBe(200);

    const cookie = res.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.value).toBe('');
  });

  it('returns current authenticated user on /api/auth/me', async () => {
    const session = createSessionToken('resident@hemratan.com');
    const req = new NextRequest('http://localhost:3000/api/auth/me', {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${session!.token}`,
      },
    });

    const res = await meHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(data.user.email).toBe('resident@hemratan.com');
  });

  it('rejects unauthenticated requests on /api/auth/me with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/me');
    const res = await meHandler(req);
    expect(res.status).toBe(401);
  });
});
