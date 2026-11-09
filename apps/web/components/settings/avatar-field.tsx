'use client';

import { useRef, useState, useTransition } from 'react';
import { setAvatar } from '@/lib/settings/actions';
import { createClient } from '@/lib/supabase/client';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SIZE = 256;

/** The picture squared from its centre and shrunk to 256 px, as WebP, so the stored file is small. */
async function squared(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/webp', 0.85));
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** The avatar, or the initials when there is none, as a round picture. */
export function Avatar({ url, name, size = 64 }: { url: string | null; name: string; size?: number }) {
  return url ? (
    // A user's own small upload from our storage; next/image would need the storage host configured per environment.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-full bg-blue font-bold" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initialsOf(name)}
    </span>
  );
}

/**
 * Change or remove the profile picture. The picture goes straight from the browser to the student's own storage
 * folder (the storage rules allow nothing else); the account then keeps its address.
 */
export function AvatarField({ userId, name, url, t, errors }: {
  userId: string;
  name: string;
  url: string | null;
  t: { change: string; remove: string; hint: string; saved: string };
  errors: { avatarType: string; avatarFailed: string };
}) {
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(url);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const upload = (file: File) =>
    start(async () => {
      setMessage(null);
      if (!TYPES.includes(file.type)) return setMessage({ ok: false, text: errors.avatarType });
      try {
        const blob = await squared(file);
        const supabase = createClient();
        // A new name each time, so browsers never show the old picture from their cache.
        const path = `${userId}/avatar-${Date.now()}.webp`;
        const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/webp', upsert: true });
        if (error) throw error;
        const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
        const result = await setAvatar(publicUrl);
        if (result.error) throw new Error(result.error);
        // The previous picture is no longer used.
        if (current) await supabase.storage.from('avatars').remove([current.split('/avatars/')[1]!]);
        setCurrent(publicUrl);
        setMessage({ ok: true, text: t.saved });
      } catch {
        setMessage({ ok: false, text: errors.avatarFailed });
      }
    });

  const remove = () =>
    start(async () => {
      setMessage(null);
      const result = await setAvatar(null);
      if (result.error) return setMessage({ ok: false, text: errors.avatarFailed });
      if (current) await createClient().storage.from('avatars').remove([current.split('/avatars/')[1]!]);
      setCurrent(null);
      setMessage({ ok: true, text: t.saved });
    });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar url={current} name={name} size={72} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => input.current?.click()}
            className="h-10 rounded-[10px] bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
          >
            {t.change}
          </button>
          {current && (
            <button type="button" disabled={pending} onClick={remove} className="h-10 rounded-[10px] border border-line bg-white px-4 text-sm font-semibold transition-colors hover:bg-bg disabled:opacity-60">
              {t.remove}
            </button>
          )}
        </div>
        <p className="text-[13px] text-muted">{t.hint}</p>
        {message && (
          <p role="status" className={`text-[13px] font-medium ${message.ok ? 'text-[#1f6b47]' : 'text-[#b33a35]'}`}>
            {message.text}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) upload(file);
        }}
      />
    </div>
  );
}
