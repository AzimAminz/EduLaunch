'use client';

import { useState, useTransition } from 'react';
import { useFormAction } from '@/components/ui/use-form-action';
import type { Dictionary } from '@/lib/i18n/locale';
import { answerQuestion, takeQuestion, type AdminTicketState } from '@/lib/engagement/ticket-actions';

type T = Dictionary['admin']['support'];

/** "Take it": marks the question as handled by this admin. */
export function TakeButton({ id, t }: { id: string; t: T }) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-flex flex-col gap-1 self-start">
      <button type="button" disabled={pending} onClick={() => start(async () => setFailed(!(await takeQuestion(id)).ok))} className="inline-flex h-10 items-center rounded-[10px] border border-line bg-white px-4 text-sm font-semibold hover:bg-bg disabled:opacity-60">
        {t.take}
      </button>
      {failed && <span className="text-[12px] text-[#b33a35]">{t.errors.generic}</span>}
    </span>
  );
}

/** The answer the student will read; sending it closes the question and notifies them. */
export function AnswerForm({ id, t }: { id: string; t: T }) {
  const [state, onSubmit, pending] = useFormAction<AdminTicketState>(answerQuestion, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{t.reply}</span>
        <textarea name="reply" required minLength={5} maxLength={2000} rows={3} placeholder={t.replyPlaceholder} className="w-full rounded-[10px] border-[1.5px] border-[#8792a6] bg-white p-3 text-sm" />
      </label>
      {state.error && !pending && (
        <p role="alert" className="text-[13px] text-[#b33a35]">
          {t.errors[state.error]}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex h-10 items-center self-start rounded-[10px] bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60">
        {pending ? t.sending : t.answer}
      </button>
    </form>
  );
}
