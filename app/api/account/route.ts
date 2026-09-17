import { NextResponse } from 'next/server';
import { getEmail, updateCredentials } from '@/lib/adminStore';

export const dynamic = 'force-dynamic';

/** Return the current sign-in email (never the password). */
export async function GET() {
  return NextResponse.json({ email: await getEmail() });
}

/**
 * Change the sign-in email and/or password. Requires the current password.
 * Body: { currentPassword, email?, newPassword? }
 */
export async function PUT(req: Request) {
  let body: { currentPassword?: string; email?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid request.' }, { status: 400 });
  }
  if (!body.currentPassword) {
    return NextResponse.json(
      { ok: false, reason: 'Enter your current password to make changes.' },
      { status: 400 },
    );
  }
  if (!body.email && !body.newPassword) {
    return NextResponse.json({ ok: false, reason: 'Nothing to update.' }, { status: 400 });
  }
  const error = await updateCredentials({
    currentPassword: body.currentPassword,
    email: body.email,
    newPassword: body.newPassword,
  });
  if (error) return NextResponse.json({ ok: false, reason: error }, { status: 400 });
  return NextResponse.json({ ok: true, email: await getEmail() });
}
