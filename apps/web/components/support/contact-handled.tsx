'use client';

import { useFormAction } from '@/components/ui/use-form-action';
import type { Dictionary } from '@/lib/i18n/locale';
import { markHandled, type HandledState } from '@/lib/site/contact-actions';

/** "Mark as answered", after the admin has replied to a contact message by e-mail. */
export function ContactHandled({ id, t }: { id: string; t: Dictionary['admin']['support']['contact'] & { generic: string } }) {
  const [state, onSubmit, pending] = useFormAction<HandledState>(markHandled, {});
  return (
    <form onSubmit={onSubmit} className="inline-flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="inline-flex h-10 items-center rounded-[10px] border border-line bg-white px-4 text-sm font-semibold hover:bg-bg disabled:opacity-60">
        {pending ? t.marking : t.markHandled}
      </button>
      {state.error && !pending && (
        <span role="alert" className="text-[12px] text-[#b33a35]">
          {state.error === 'taken' ? t.taken : t.generic}
        </span>
      )}
    </form>
  );
}
