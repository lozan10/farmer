import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Communication module materials (images/videos).
 *
 * Upload is a two-step, admin-only flow so large files never pass through this
 * serverless function:
 *   1. POST { op: 'sign', name, type } -> server issues a signed upload URL for
 *      the "communication-materials" bucket.
 *   2. The browser uploads straight to Storage with that signed URL.
 *   3. POST { op: 'record', path, name, type, size } -> server records metadata.
 *
 * GET lists materials; DELETE removes one (admin only).
 */
const BUCKET = 'communication-materials';
const TABLE = 'communication_materials';
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

function admin(session: Awaited<ReturnType<typeof getSession>>) {
  return Boolean(session?.isAdmin) || /admin/i.test(session?.role ?? '');
}
function okType(t: string) {
  return /^image\//.test(t) || /^video\//.test(t);
}
function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, '_').slice(-80) || 'file';
}

export async function GET() {
  const session = await getSession();
  const isAdmin = admin(session);
  if (!supabaseAdmin) return NextResponse.json({ materials: [], isAdmin });
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('id,name,type,url,path,size,created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ materials: [], isAdmin, reason: error.message });
  return NextResponse.json({ materials: data ?? [], isAdmin });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!admin(session)) {
    return NextResponse.json({ ok: false, reason: 'Only administrators can upload materials.' }, { status: 403 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, reason: 'Set SUPABASE_SERVICE_ROLE_KEY in .env to enable uploads.' }, { status: 500 });
  }
  let body: { op?: string; name?: string; type?: string; path?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid JSON body.' }, { status: 400 });
  }

  if (body.op === 'sign') {
    const type = String(body.type ?? '');
    if (!okType(type)) return NextResponse.json({ ok: false, reason: 'Only image and video files are allowed.' }, { status: 400 });
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(String(body.name ?? 'file'))}`;
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ ok: false, reason: error?.message || 'Could not start upload.' }, { status: 500 });
    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, path, token: data.token, url: pub.publicUrl });
  }

  if (body.op === 'record') {
    const path = String(body.path ?? '');
    const type = String(body.type ?? '');
    const name = String(body.name ?? '').slice(0, 160) || 'Untitled';
    const size = Number(body.size ?? 0);
    if (!path || !okType(type)) return NextResponse.json({ ok: false, reason: 'Invalid upload.' }, { status: 400 });
    if (size > MAX_BYTES) return NextResponse.json({ ok: false, reason: 'File exceeds the 200 MB limit.' }, { status: 400 });
    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({ name, type, path, url: pub.publicUrl, size, uploaded_by: session?.email ?? '' })
      .select('id,name,type,url,path,size,created_at')
      .single();
    if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, material: data });
  }

  return NextResponse.json({ ok: false, reason: 'Unknown operation.' }, { status: 400 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!admin(session)) {
    return NextResponse.json({ ok: false, reason: 'Only administrators can delete materials.' }, { status: 403 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, reason: 'Service role key not configured.' }, { status: 500 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, reason: 'Missing id.' }, { status: 400 });
  const { data: row } = await supabaseAdmin.from(TABLE).select('path').eq('id', id).maybeSingle();
  if (row?.path) await supabaseAdmin.storage.from(BUCKET).remove([row.path]).catch(() => {});
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
