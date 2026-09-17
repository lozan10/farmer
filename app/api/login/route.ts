import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isConfigured, verify, getEmail } from '@/lib/adminStore';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type SessionUser = { name: string; email: string; role: string; initials: string; isAdmin: boolean };

function setSession(res: NextResponse, user: SessionUser) {
  // Lightweight pilot session: identifies the signed-in user and their role so
  // the dashboard can show the right name and the server can gate admin actions.
  // Not cryptographically signed — fine for the pilot; use real auth for prod.
  const value = Buffer.from(JSON.stringify({ email: user.email, role: user.role, isAdmin: user.isAdmin })).toString('base64');
  res.cookies.set('fl_session', value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}

/**
 * Validates the dashboard's front-gate login. Two credential sources:
 *   1. The admin store (lib/adminStore) — the primary .env admin.
 *   2. Users created in User management — verified by bcrypt-comparing the
 *      submitted password against password_hash, read server-side with the
 *      service-role key (the hash is never exposed to the browser).
 * On success it returns the signed-in user and sets the fl_session cookie.
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
    const adminEmail = await getEmail();
    const user: SessionUser = { name: 'Kenneth Owori', email: adminEmail, role: 'Administrator', initials: 'KO', isAdmin: true };
    return setSession(NextResponse.json({ ok: true, user }), user);
  }

  // 2) A user from the app_users table.
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('app_users')
      .select('name,email,role,initials,password_hash,status')
      .ilike('email', email.trim())
      .maybeSingle();
    if (data?.password_hash) {
      if (data.status === 'Suspended') {
        return NextResponse.json({ ok: false, reason: 'This account is suspended.' }, { status: 403 });
      }
      if (await bcrypt.compare(password, data.password_hash)) {
        const isAdmin = data.role === 'Administrator';
        const initials =
          data.initials || String(data.name || data.email).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        const user: SessionUser = { name: data.name || data.email, email: data.email, role: data.role, initials, isAdmin };
        return setSession(NextResponse.json({ ok: true, user }), user);
      }
    }
  }

  return NextResponse.json({ ok: false, reason: 'Incorrect email or password.' }, { status: 401 });
}
