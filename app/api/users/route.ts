import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Columns returned to the client — never the hash.
const SELECT = 'id,name,email,role,status,initials,modules';

type Payload = {
  name: string;
  email: string;
  role: string;
  status: string;
  initials: string;
  modules: string[];
  password?: string;
};

function guard() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, reason: 'User store is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.' },
      { status: 500 },
    );
  }
  return null;
}

function clean(body: Partial<Payload>) {
  return {
    name: String(body.name ?? '').trim(),
    email: String(body.email ?? '').trim(),
    role: String(body.role ?? 'Viewer'),
    status: String(body.status ?? 'Active'),
    initials: String(body.initials ?? '').slice(0, 2).toUpperCase(),
    modules: Array.isArray(body.modules) ? body.modules.map(String) : [],
  };
}

/** Create a user. Body: Payload (password required). */
export async function POST(req: Request) {
  const blocked = guard();
  if (blocked) return blocked;
  let body: Partial<Payload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid request.' }, { status: 400 });
  }
  const row = clean(body);
  if (!row.name || !row.email) return NextResponse.json({ ok: false, reason: 'Name and email are required.' }, { status: 400 });
  if (!body.password || body.password.length < 8)
    return NextResponse.json({ ok: false, reason: 'Password must be at least 8 characters.' }, { status: 400 });

  const password_hash = await bcrypt.hash(body.password, 10);
  const { data, error } = await supabaseAdmin!
    .from('app_users')
    .insert({ ...row, password_hash })
    .select(SELECT)
    .single();
  if (error) {
    const dup = error.code === '23505';
    return NextResponse.json(
      { ok: false, reason: dup ? 'A user with this email already exists.' : error.message },
      { status: dup ? 409 : 400 },
    );
  }
  return NextResponse.json({ ok: true, user: data });
}

/** Update a user. Body: Payload & { id }; password optional (blank = keep). */
export async function PUT(req: Request) {
  const blocked = guard();
  if (blocked) return blocked;
  let body: Partial<Payload> & { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid request.' }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ ok: false, reason: 'Missing user id.' }, { status: 400 });
  const row = clean(body);
  const update: Record<string, unknown> = { ...row };
  if (body.password) {
    if (body.password.length < 8)
      return NextResponse.json({ ok: false, reason: 'Password must be at least 8 characters.' }, { status: 400 });
    update.password_hash = await bcrypt.hash(body.password, 10);
  }
  const { data, error } = await supabaseAdmin!
    .from('app_users')
    .update(update)
    .eq('id', body.id)
    .select(SELECT)
    .single();
  if (error) {
    const dup = error.code === '23505';
    return NextResponse.json(
      { ok: false, reason: dup ? 'A user with this email already exists.' : error.message },
      { status: dup ? 409 : 400 },
    );
  }
  return NextResponse.json({ ok: true, user: data });
}
