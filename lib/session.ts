import 'server-only';
import { cookies } from 'next/headers';

export type Session = { email: string; role: string; isAdmin: boolean } | null;

/** Read the fl_session cookie set at login. Returns null if absent/invalid. */
export async function getSession(): Promise<Session> {
  try {
    const raw = (await cookies()).get('fl_session')?.value;
    if (!raw) return null;
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    if (parsed && typeof parsed.email === 'string') {
      return { email: parsed.email, role: String(parsed.role ?? ''), isAdmin: Boolean(parsed.isAdmin) };
    }
  } catch {
    /* malformed cookie */
  }
  return null;
}
