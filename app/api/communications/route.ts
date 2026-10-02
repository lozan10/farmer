import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Communication activities (radio ads, banners, SMS blasts, meetings...).
 * Everyone signed in may read them; only administrators may add or import,
 * which is why writes re-check the server session rather than trusting the UI.
 * Create the table with the comm_records block in supabase-setup.sql.
 */
const TABLE = 'comm_records';
const SELECT = 'id,ref,type,title,district,quantity,status,happened_on';

export type CommRow = {
  ref: string;
  type: string;
  title: string;
  district: string;
  quantity: string;
  status: string;
  happened_on: string | null;
};

async function isAdmin() {
  const session = await getSession();
  return Boolean(session?.isAdmin) || /admin/i.test(session?.role ?? '');
}

function clean(row: Record<string, unknown>): CommRow | null {
  const type = String(row.type ?? '').trim();
  const title = String(row.title ?? '').trim();
  if (!type && !title) return null;
  const date = String(row.happened_on ?? '').trim();
  return {
    ref: String(row.ref ?? '').trim() || `COM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    type,
    title,
    district: String(row.district ?? '').trim(),
    quantity: String(row.quantity ?? '').trim(),
    status: String(row.status ?? 'Completed').trim(),
    happened_on: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
  };
}

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json({ rows: [], isAdmin: await isAdmin() });
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select(SELECT)
    .order('happened_on', { ascending: false, nullsFirst: false })
    .limit(500);
  return NextResponse.json({
    rows: error ? [] : (data ?? []),
    isAdmin: await isAdmin(),
    reason: error?.message,
  });
}

/** Body: { rows: CommRow[] } — one record from the form, or many from a CSV import. */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { ok: false, reason: 'Only administrators can add communication records.' },
      { status: 403 },
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, reason: 'Set SUPABASE_SERVICE_ROLE_KEY in .env to save records.' },
      { status: 500 },
    );
  }
  let body: { rows?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid JSON body.' }, { status: 400 });
  }
  const list = Array.isArray(body.rows) ? body.rows : [];
  const rows = list
    .map((r) => clean(r as Record<string, unknown>))
    .filter((r): r is CommRow => r !== null)
    .slice(0, 2000);
  if (!rows.length) {
    return NextResponse.json({ ok: false, reason: 'Nothing to import.' }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from(TABLE).upsert(rows, { onConflict: 'ref' });
  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, added: rows.length });
}

/** Body: { ref } — remove one record. */
export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: 'Only administrators can delete records.' }, { status: 403 });
  }
  if (!supabaseAdmin) return NextResponse.json({ ok: false, reason: 'Not configured.' }, { status: 500 });
  const ref = String(new URL(req.url).searchParams.get('ref') ?? '').trim();
  if (!ref) return NextResponse.json({ ok: false, reason: 'Missing ref.' }, { status: 400 });
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('ref', ref);
  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
