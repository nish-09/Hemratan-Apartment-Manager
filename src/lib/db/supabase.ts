import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let browserClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

/**
 * Returns a singleton client-safe Supabase instance using the public anon key.
 * Strictly forbidden from accessing privileged admin operations.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  if (!browserClient) {
    browserClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return browserClient;
}

/**
 * Returns a server-side privileged Supabase client using the Service Role Key.
 * NEVER call or expose this on the client browser.
 */
export function getServerAdminSupabase(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('SECURITY ALERT: Attempted to instantiate admin Supabase client in browser context!');
  }

  if (!adminClient) {
    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClient;
}
