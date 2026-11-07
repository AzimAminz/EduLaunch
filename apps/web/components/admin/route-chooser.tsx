'use client';

import { useState } from 'react';
import { startRequirement, type AdminFormState } from '@/lib/admin/actions';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { Dropdown } from '@/components/ui/dropdown';
import { useFormAction } from '@/components/ui/use-form-action';
import { FormAlert } from '@/components/auth/fields';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';

export interface RouteChoice {
  /** Unique per option: the route, plus the ePanduan category it is filled from. */
  key: string;
  route: string;
  /** The ePanduan candidate category the requirement is for, null when written without one. */
  category: string | null;
  /** ePanduan category (`jenprog:category`) the editor fills the draft from. */
  fill?: string;
  label: string;
  /** The ePanduan categories it is filled from ("STPM Sains · STPM Sastera"). */
  detail: string | null;
  /** What exists for this route already. */
  state: 'draft' | 'published' | null;
}

type Texts = Dictionary['admin']['requirement']['chooser'];

/** Step 1: which route the requirements are for. Going on creates the draft (or opens the one in progress). */
export function RouteChooser({ locale, programId, groups, initial, copies, t, errors, noMatches }: {
  locale: Locale;
  programId: string;
  groups: Array<{ title: string; choices: RouteChoice[] }>;
  /** The choice already made (from a route's tab). */
  initial?: string;
  /** Approved requirements of other programmes of the institution, by route, that can be copied. */
  copies: Record<string, Array<{ value: string; label: string }>>;
  t: Texts;
  errors: Dictionary['admin']['errors'];
  noMatches: string;
}) {
  const [chosen, setChosen] = useState<RouteChoice | null>(() => groups.flatMap((g) => g.choices).find((c) => c.key === initial) ?? null);
  // How the draft starts: from the ePanduan text, a copy of approved requirements, or empty.
  const [start, setStart] = useState<'epanduan' | 'copy' | 'empty' | null>(null);
  const [copyFrom, setCopyFrom] = useState('');
  const canCopy = !!chosen && (copies[chosen.route]?.length ?? 0) > 0;
  const how = start ?? (chosen?.fill ? 'epanduan' : 'empty');
  const [missing, setMissing] = useState(false);
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(startRequirement, {});
  return (
    <form
      onSubmit={(e) => {
        if (!chosen || (how === 'copy' && !copyFrom)) {
          e.preventDefault();
          setMissing(true);
          return;
        }
        onSubmit(e);
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="entryRoute" value={chosen?.route ?? ''} />
      {chosen?.category && <input type="hidden" name="category" value={chosen.category} />}
      {chosen?.fill && how === 'epanduan' && <input type="hidden" name="fill" value={chosen.fill} />}
      {how === 'copy' && copyFrom && <input type="hidden" name="copyFrom" value={copyFrom} />}
      <FormAlert>{!pending && state.error ? errors[state.error] : missing && !chosen ? t.required : missing && how === 'copy' && !copyFrom ? t.copyRequired : undefined}</FormAlert>
      {groups
        .filter((g) => g.choices.length)
        .map((group) => (
          <fieldset key={group.title} className="flex flex-col gap-2">
            <legend className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted">{group.title}</legend>
            <div className="grid gap-2 md:grid-cols-2">
              {group.choices.map((c) => {
                const on = chosen?.key === c.key;
                return (
                  <label
                    key={c.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy/40 ${
                      on ? 'border-navy bg-navy/[0.04]' : 'border-line bg-white hover:border-navy/30'
                    }`}
                  >
                    <input type="radio" name="choice" value={c.key} checked={on} onChange={() => setChosen(c)} className="mt-1 size-4 accent-[#1b2a4a]" />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-semibold">{c.label}</span>
                      {c.detail && <span className="text-[13px] text-muted">{c.detail}</span>}
                      {c.state && (
                        <span className={`inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.state === 'draft' ? 'bg-cream text-navy' : 'bg-mint text-[#1f6b47]'}`}>
                          <AdminIcon name={c.state === 'draft' ? 'pencil' : 'checkCircle'} size={12} />
                          {c.state === 'draft' ? t.hasDraft : t.hasPublished}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      {chosen && (chosen.fill || canCopy) && (
        <fieldset className="flex flex-col gap-2 rounded-[14px] bg-bg/60 p-4">
          <legend className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted">{t.startTitle}</legend>
          {(
            [
              chosen.fill && { value: 'epanduan', label: t.startEpanduan, detail: chosen.detail },
              canCopy && { value: 'copy', label: t.startCopy, detail: t.startCopyDetail },
              { value: 'empty', label: t.startEmpty, detail: null },
            ].filter(Boolean) as Array<{ value: 'epanduan' | 'copy' | 'empty'; label: string; detail: string | null }>
          ).map((o) => (
            <label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-[12px] bg-white px-4 py-3">
              <input type="radio" name="start" checked={how === o.value} onChange={() => setStart(o.value)} className="mt-1 size-4 accent-[#1b2a4a]" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{o.label}</span>
                {o.detail && <span className="text-[13px] text-muted">{o.detail}</span>}
              </span>
            </label>
          ))}
          {how === 'copy' && canCopy && (
            <Dropdown label={t.copyLabel} value={copyFrom} onChange={setCopyFrom} options={copies[chosen.route]!} placeholder={t.copyPlaceholder} noMatchesLabel={noMatches} />
          )}
        </fieldset>
      )}
      <div className="flex justify-end border-t border-line pt-4">
        <button type="submit" disabled={pending} className={buttonClass('primary')}>
          <IconText icon="arrowRight" busy={pending}>
            {t.next}
          </IconText>
        </button>
      </div>
    </form>
  );
}
