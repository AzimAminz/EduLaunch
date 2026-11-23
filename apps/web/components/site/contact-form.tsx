'use client';

import { useFormAction } from '@/components/ui/use-form-action';
import { Icon } from '@/components/ui/icon';
import type { Dictionary } from '@/lib/i18n/locale';
import { sendContact, type ContactFormState } from '@/lib/site/contact-actions';

type T = Dictionary['site']['pages']['contact'];
const CATEGORIES = ['usage', 'data', 'privacy', 'other'] as const;

/**
 * The public contact form. A hidden "website" field catches form-filling bots (people never see it); once sent, the
 * form gives way to a thank-you with a way to send another.
 */
export function ContactForm({ t }: { t: T }) {
  const [state, onSubmit, pending] = useFormAction<ContactFormState>(sendContact, {});
  const field = 'h-[52px] w-full min-w-0 rounded-[12px] border-[1.5px] border-[#8792a6] bg-white px-4 text-base placeholder:text-muted';

  if (state.sentAt) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-[14px] bg-mint p-5">
        <p className="text-[15px] font-medium">{t.sent}</p>
        <a href="" className="text-sm font-semibold text-[#2f5bd3] hover:underline">
          {t.sendAnother}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.name}</span>
        <input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder={t.namePlaceholder} className={field} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.email}</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" inputMode="email" placeholder={t.emailPlaceholder} className={field} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.category}</span>
        <select name="category" required defaultValue="" className={`${field} invalid:text-muted`}>
          <option value="" disabled>
            {t.categoryPlaceholder}
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="text-navy">
              {t.categories[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.message}</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          aria-describedby="hint-mesej"
          placeholder={t.messagePlaceholder}
          className="w-full min-w-0 rounded-[12px] border-[1.5px] border-[#8792a6] bg-white p-4 text-base placeholder:text-muted"
        />
        <span id="hint-mesej" className="text-[12px] text-muted">
          {t.messageHint}
        </span>
      </label>
      {/* For bots only: hidden from people and from screen readers, and skipped by the keyboard. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          {t.trap}
          <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      {state.error && !pending && (
        <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-sm text-[#b33a35]">
          {t.errors[state.error]}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex h-[50px] items-center gap-2.5 self-start rounded-[12px] bg-navy px-6 text-base font-semibold text-white hover:bg-navy/90 disabled:opacity-60">
        <Icon src="/icons/message.svg" size={18} className="brightness-0 invert" />
        {pending ? t.sending : t.send}
      </button>
    </form>
  );
}
