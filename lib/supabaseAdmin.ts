import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the SERVICE ROLE key. It bypasses RLS and
 * can read/write the password_hash column, which the public (anon) key is
 * blocked from. Never import this from client code, and never expose the key
 * (no NEXT_PUBLIC_ prefix).
 *
 *   NEXT_PUBLIC_SUPABASE_URL        (shared with the browser client)
 *   SUPABASE_SERVICE_ROLE_KEY       server-only secret
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin: SupabaseClient | null =
  url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

export const adminConfigured = Boolean(supabaseAdmin);
