import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginHandler } from './login/route';
import { POST as logoutHandler } from './logout/route';
import { GET as meHandler } from './me/route';
import { createSessionToken, SESSION_COOKIE_NAME, verifySession } from '@/lib/auth/session';

describe('Auth API Handlers (Password-Only Authentication & Security Audit)', () => {
  it('logs in Resident with valid email and password', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'resident@hemratan.com', password: 'Password@123' }),
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

  it('rejects incorrect password with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'resident@hemratan.com', password: 'WrongPassword!99' }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('Invalid email or password');
  });

  it('rejects unknown email with uniform 401 (preventing account enumeration)', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'unregistered@example.com', password: 'Password@123' }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('Invalid email or password');
  });

  it('rejects deactivated account with 403 Forbidden', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'inactive@hemratan.com', password: 'Password@123' }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toContain('deactivated');
  });

  it('revokes session on server side and clears cookie on logout', async () => {
    const session = createSessionToken('resident@hemratan.com');
    const token = session!.token;

    // Verify token is initially valid
    expect(verifySession(token)).not.toBeNull();

    const logoutReq = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const res = await logoutHandler(logoutReq);
    expect(res.status).toBe(200);

    // Verify cookie cleared
    const cookie = res.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.value).toBe('');

    // Verify server-side token revocation (token replay attack prevention)
    expect(verifySession(token)).toBeNull();
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
