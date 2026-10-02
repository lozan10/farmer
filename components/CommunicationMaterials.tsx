'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, ImageIcon, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Material = { id: string; name: string; type: string; url: string; path: string; size: number; created_at: string };

const fmtSize = (b: number) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

export default function CommunicationMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/communication', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (alive) { setMaterials(d.materials ?? []); setIsAdmin(Boolean(d.isAdmin)); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const upload = useCallback(async (files: FileList | File[]) => {
    setError('');
    for (const file of Array.from(files)) {
      if (!/^(image|video)\//.test(file.type)) { setError(`"${file.name}" is not an image or video.`); continue; }
      setBusy(file.name);
      try {
        // 1) Ask the server (admin-gated) for a signed upload URL.
        const signRes = await fetch('/api/communication', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ op: 'sign', name: file.name, type: file.type }),
        });
        const sign = await signRes.json();
        if (!sign.ok) { setError(sign.reason || 'Upload not allowed.'); continue; }
        // 2) Upload the file straight to Storage (bypasses the serverless body limit).
        if (!supabase) { setError('Storage is not configured.'); continue; }
        const up = await supabase.storage.from('communication-materials').uploadToSignedUrl(sign.path, sign.token, file);
        if (up.error) { setError(up.error.message); continue; }
        // 3) Record the metadata.
        const recRes = await fetch('/api/communication', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ op: 'record', path: sign.path, name: file.name, type: file.type, size: file.size }),
        });
        const rec = await recRes.json();
        if (rec.ok) setMaterials((m) => [rec.material, ...m]);
        else setError(rec.reason || 'Could not save the upload.');
      } catch {
        setError('Upload failed. Try again.');
      } finally {
        setBusy(null);
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  async function remove(id: string) {
    const prev = materials;
    setMaterials((m) => m.filter((x) => x.id !== id));
    const res = await fetch(`/api/communication?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
    if (!res || !res.ok) { setMaterials(prev); setError('Could not delete the material.'); }
  }

  return (
    <article className="panel materials-panel">
      <div className="panelhead">
        <div><small>OUTREACH LIBRARY</small><h2>Materials</h2></div>
        {isAdmin && (
          <button className="mat-upload" onClick={() => inputRef.current?.click()} disabled={!!busy}>
            {busy ? <Loader2 className="spin" /> : <UploadCloud />}{busy ? 'Uploading…' : 'Upload'}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden
        onChange={(e) => e.target.files && upload(e.target.files)} />

      {isAdmin && (
        <div
          className={drag ? 'dropzone over' : 'dropzone'}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) upload(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud />
          <span>Drag & drop images or videos here, or <b>browse</b></span>
          <em>Radio clips, banners, posters, flyers — up to 200 MB each</em>
        </div>
      )}

      {error && <p className="mat-error">{error}</p>}

      {loading ? (
        <p className="mat-empty">Loading materials…</p>
      ) : materials.length === 0 ? (
        <p className="mat-empty">{isAdmin ? 'No materials yet. Upload your first image or video.' : 'No materials have been shared yet.'}</p>
      ) : (
        <div className="mat-grid">
          {materials.map((m) => (
            <figure className="mat-card" key={m.id}>
              <div className="mat-thumb">
                {/^video\//.test(m.type)
                  ? <video src={m.url} controls preload="metadata" />
                  : <a href={m.url} target="_blank" rel="noopener noreferrer"><img src={m.url} alt={m.name} loading="lazy" /></a>}
              </div>
              <figcaption>
                <span className="mat-type">{/^video\//.test(m.type) ? <Film /> : <ImageIcon />}</span>
                <div className="mat-meta"><b title={m.name}>{m.name}</b><small>{m.size ? fmtSize(m.size) : m.type}</small></div>
                {isAdmin && <button className="mat-del" aria-label={`Delete ${m.name}`} onClick={() => remove(m.id)}><Trash2 /></button>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </article>
  );
}
