import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isConfigured, verify } from '@/lib/adminStore';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * Validates the dashboard's front-gate login. Two credential sources:
 *   1. The admin store (lib/adminStore) — the primary .env admin.
 *   2. Users created in User management — verified by bcrypt-comparing the
 *      submitted password against password_hash, read server-side with the
 *      service-role key (the hash is never exposed to the browser).
 * The password never reaches the browser; the client only gets ok/false.
 */
export async function POST(req: Request) {
  let email = '';
  let password = '';
  try {
    const body = await req.json();
    email = String(body?.email ?? '');
    password = String(body?.password ?? '');
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid request.' }, { status: 400 });
  }

  // 1) Admin credential.
  if ((await isConfigured()) && (await verify(email, password))) {
    return NextResponse.json({ ok: true });
  }

  // 2) A user from the app_users table.
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('app_users')
      .select('email,password_hash,status')
      .ilike('email', email.trim())
      .maybeSingle();
    if (data?.password_hash) {
      if (data.status === 'Suspended') {
        return NextResponse.json({ ok: false, reason: 'This account is suspended.' }, { status: 403 });
      }
      if (await bcrypt.compare(password, data.password_hash)) {
        return NextResponse.json({ ok: true });
      }
    }
  }

  return NextResponse.json({ ok: false, reason: 'Incorrect email or password.' }, { status: 401 });
}
