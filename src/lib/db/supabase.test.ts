import { describe, it, expect, vi } from 'vitest';
import { getBrowserSupabase, getServerAdminSupabase } from './supabase';

describe('Supabase Client Lifecycle', () => {
  it('instantiates browser client safely with public anon credentials', () => {
    const client = getBrowserSupabase();
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('instantiates server admin client in server-side context', () => {
    const admin = getServerAdminSupabase();
    expect(admin).toBeDefined();
    expect(typeof admin.from).toBe('function');
  });

  it('throws security error if admin client is requested in browser window context', () => {
    vi.stubGlobal('window', {});
    try {
      expect(() => getServerAdminSupabase()).toThrow(/SECURITY ALERT/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
