'use client';

import { useRef, useState, useTransition } from 'react';
import type { Dictionary } from '@/lib/i18n/locale';
import { readSlip, type SlipResult } from '@/lib/academic/slip-actions';

type T = Dictionary['academic']['slip'];
const LONGEST_SIDE = 2000;

/** A photo is shrunk in the browser (and turned upright) before it is sent: faster to upload and to read. */
async function prepare(file: File): Promise<Blob> {
  if (file.type === 'application/pdf') return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('shrink failed'))), 'image/jpeg', 0.85));
}

/**
 * "Fill from my result slip": a PDF from the results portal or a photo of the printed slip, read on EduLaunch's own
 * server and never stored. The rows go into the form below for the student to check and save.
 */
export function SlipUpload({ t, onRead }: { t: T; onRead: (result: Extract<SlipResult, { ok: true }>) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pick = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    start(async () => {
      let blob: Blob;
      try {
        blob = await prepare(file);
      } catch {
        return setError(t.errors.unreadable);
      }
      const form = new FormData();
      form.set('slip', new File([blob], file.type === 'application/pdf' ? 'slip.pdf' : 'slip.jpg', { type: blob.type || file.type }));
      const result = await readSlip(form);
      if (!result.ok) return setError(t.errors[result.error]);
      onRead(result);
    });
    if (input.current) input.current.value = '';
  };
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-dashed border-[#8792a6] bg-white p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{t.title}</p>
        <p className="text-[13px] text-muted">{t.hint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className={`inline-flex h-11 cursor-pointer items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90 ${pending ? 'pointer-events-none opacity-60' : ''}`}>
          {pending ? t.reading : t.choose}
          <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={pending} onChange={(e) => pick(e.target.files?.[0])} className="sr-only" />
        </label>
        <span className="text-[12px] text-muted">{t.privacy}</span>
      </div>
      {error && (
        <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-sm text-[#b33a35]">
          {error}
        </p>
      )}
    </section>
  );
}
