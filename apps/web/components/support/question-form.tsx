'use client';

import { useState } from 'react';
import { useFormAction } from '@/components/ui/use-form-action';
import { Notice } from '@/components/ui/notice';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { sendQuestion, type TicketFormState } from '@/lib/engagement/ticket-actions';

type T = Dictionary['help']['form'];
type Category = 'wrong_data' | 'account' | 'other';

/** A question to the EduLaunch team; "wrong programme data" asks which programme. Cleared after it is sent. */
export function QuestionForm({ locale, programmes, initial, t }: { locale: Locale; programmes: Array<{ id: string; name: string }>; initial: { category: Category; programId: string | null }; t: T }) {
  const [state, onSubmit, pending] = useFormAction<TicketFormState>(sendQuestion, {});
  const [category, setCategory] = useState<Category>(initial.category);
  const field = 'h-12 w-full min-w-0 rounded-[12px] border-[1.5px] border-[#8792a6] bg-white px-3 text-[15px]';
  return (
    <div className="flex flex-col gap-3">
    {/* The form starts empty again after a send; the confirmation stays outside it. */}
    <Notice showKey={state.sentAt}>{t.sent}</Notice>
    <form key={state.sentAt ?? 0} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.category}</span>
        <select name="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className={field}>
          {(['wrong_data', 'account', 'other'] as const).map((c) => (
            <option key={c} value={c}>
              {t.categories[c]}
            </option>
          ))}
        </select>
      </label>
      {category === 'wrong_data' && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t.programme}</span>
          <select name="programId" defaultValue={initial.programId ?? ''} className={field} aria-invalid={state.error === 'programme' || undefined}>
            <option value="">{t.pickProgramme}</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-muted">{t.programmeHint}</span>
        </label>
      )}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.message}</span>
        <textarea name="message" required minLength={10} maxLength={2000} rows={5} placeholder={category === 'wrong_data' ? t.placeholderData : t.placeholder} className="w-full min-w-0 rounded-[12px] border-[1.5px] border-[#8792a6] bg-white p-3 text-[15px]" />
      </label>
      {state.error && !pending && (
        <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-sm text-[#b33a35]">
          {t.errors[state.error]}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60">
          {pending ? t.sending : t.send}
        </button>
      </div>
    </form>
    </div>
  );
}
