'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client for the settings screens (User management + User
 * profile). Uses the publishable/anon key, which is safe to ship to the browser
 * — access is governed by Row Level Security policies on the tables (see the
 * setup SQL in supabase-setup.sql).
 *
 * If the env vars aren't set, `supabase` is null and the screens fall back to
 * their built-in seed data, so the app still renders without a backend.
 *
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseEnabled = Boolean(supabase);
