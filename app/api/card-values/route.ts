import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Admin-editable overrides for the dashboard stat cards. Each row is keyed by
 * "<module>|<card label>" and holds the text shown on the card, so a card can
 * carry a number FarmerLink doesn't expose (radio ads, banners printed...).
 * Create the table with the card_values block in supabase-setup.sql.
 */
const TABLE = 'card_values';

export async function GET() {
  // `admin` lets the dashboard show the edit affordance only when the SERVER
  // session (not the browser copy) is an administrator.
  const session = await getSession();
  const isAdmin = Boolean(session?.isAdmin) || /admin/i.test(session?.role ?? '');
  if (!supabaseAdmin) return NextResponse.json({ values: {}, isAdmin });
  const { data, error } = await supabaseAdmin.from(TABLE).select('key,value');
  if (error) return NextResponse.json({ values: {}, isAdmin, reason: error.message });
  const values: Record<string, string> = {};
  for (const row of data ?? []) values[row.key as string] = String(row.value ?? '');
  return NextResponse.json({ values, isAdmin });
}

export async function PUT(req: Request) {
  const session = await getSession();
  const admin = Boolean(session?.isAdmin) || /admin/i.test(session?.role ?? '');
  if (!admin) {
    return NextResponse.json(
      { ok: false, reason: 'Only administrators can edit card values.' },
      { status: 403 },
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, reason: 'Set SUPABASE_SERVICE_ROLE_KEY in .env to save card values.' },
      { status: 500 },
    );
  }
  let body: { key?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid JSON body.' }, { status: 400 });
  }
  const key = String(body.key ?? '').trim();
  if (!key) return NextResponse.json({ ok: false, reason: 'Missing key.' }, { status: 400 });
  const value = String(body.value ?? '').trim().slice(0, 40);
  const { error } = await supabaseAdmin
    .from(TABLE)
    .upsert({ key, value, updated_by: session?.email ?? '', updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
