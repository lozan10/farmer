import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Clear the session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('fl_session', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
