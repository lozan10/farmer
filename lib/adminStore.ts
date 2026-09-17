import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Server-only store for the dashboard's admin sign-in credentials.
 *
 * Seeded from ADMIN_EMAIL / ADMIN_PASSWORD in .env on first read, then persisted
 * to .data/admin.json so changes made from the profile page survive restarts.
 * The password never leaves the server — only `getEmail()` is exposed to the UI.
 *
 * Note: this is a single-admin pilot store with a plaintext password, matching
 * the existing .env setup. For production, move to hashed credentials in a real
 * user table (e.g. Supabase Auth).
 */
type Admin = { email: string; password: string };

const FILE = path.join(process.cwd(), '.data', 'admin.json');

async function read(): Promise<Admin> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as Admin;
  } catch {
    return {
      email: process.env.ADMIN_EMAIL ?? '',
      password: process.env.ADMIN_PASSWORD ?? '',
    };
  }
}

async function write(a: Admin): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(a, null, 2), 'utf8');
}

export async function isConfigured(): Promise<boolean> {
  const a = await read();
  return Boolean(a.email && a.password);
}

export async function getEmail(): Promise<string> {
  return (await read()).email;
}

export async function verify(email: string, password: string): Promise<boolean> {
  const a = await read();
  return a.email.trim().toLowerCase() === email.trim().toLowerCase() && a.password === password;
}

/**
 * Update email and/or password after checking the current password.
 * Returns an error string on failure, or null on success.
 */
export async function updateCredentials(input: {
  currentPassword: string;
  email?: string;
  newPassword?: string;
}): Promise<string | null> {
  const a = await read();
  if (input.currentPassword !== a.password) return 'Current password is incorrect.';
  const next: Admin = { ...a };
  if (input.email && input.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Enter a valid email address.';
    next.email = input.email.trim();
  }
  if (input.newPassword) {
    if (input.newPassword.length < 8) return 'New password must be at least 8 characters.';
    next.password = input.newPassword;
  }
  await write(next);
  return null;
}
