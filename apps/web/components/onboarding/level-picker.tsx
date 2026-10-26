'use client';

import { useActionState, useState } from 'react';
import { chooseEducationLevel } from '@/lib/auth/actions';
import { EDUCATION_LEVELS } from '@/lib/profile/levels';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, SubmitButton } from '@/components/auth/fields';

type Level = (typeof EDUCATION_LEVELS)[number]['level'];

interface LevelPickerProps {
  locale: Locale;
  t: Dictionary['onboarding'];
  errors: Dictionary['auth']['errors'];
  /** The profile page shows the current choice and returns to itself; onboarding starts empty and goes on to the portal. */
  initial?: { level: Level | null; formYear: number | null };
  /** Stay on this page after saving and show `savedLabel` (the profile page). */
  savedLabel?: string;
  submitLabel?: string;
}

/** "What is your education level now?" — one card per level; Form 1–3 and 4–5 also ask which form. */
export function LevelPicker({ locale, t, errors, initial, savedLabel, submitLabel }: LevelPickerProps) {
  const [state, action] = useActionState(chooseEducationLevel, {});
  const [level, setLevel] = useState<Level | null>((state.values?.level as Level) || initial?.level || null);
  const [form, setForm] = useState<number | null>(Number(state.values?.formYear) || initial?.formYear || null);

  const chosen = EDUCATION_LEVELS.find((l) => l.level === level);
  const short = chosen && (!chosen.forms || form) ? format(t.levels[chosen.level].short, { form: form ?? '' }) : null;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {savedLabel && <input type="hidden" name="stay" value="1" />}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-xl font-semibold">{t.question}</legend>
        <p className="text-sm text-muted">{t.questionHint}</p>
        <FormAlert>{state.error && errors[state.error]}</FormAlert>
        <div className="grid gap-3 sm:grid-cols-2">
          {EDUCATION_LEVELS.map(({ level: value, forms }) => {
            const selected = level === value;
            const copy = t.levels[value];
            return (
              <div key={value} className={`flex flex-col gap-2 rounded-[12px] border-2 p-3.5 ${selected ? 'border-navy bg-blue' : 'border-transparent bg-bg'}`}>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="radio"
                    name="level"
                    value={value}
                    checked={selected}
                    onChange={() => {
                      setLevel(value);
                      setForm(null);
                    }}
                    className="mt-1 size-4 shrink-0 accent-navy"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">{copy.title}</span>
                    <span className="text-[13px] leading-snug text-muted">{copy.body}</span>
                  </span>
                </label>
                {selected && forms && (
                  <div role="radiogroup" aria-label={t.formLabel} className="flex items-center gap-2 pl-6">
                    <span className="text-[13px] font-medium">{t.formLabel}</span>
                    {forms.map((n) => (
                      <label key={n} className={`flex size-8 cursor-pointer items-center justify-center rounded-full text-sm font-semibold ${form === n ? 'bg-navy text-white' : 'bg-white'}`}>
                        <input type="radio" name="formYear" value={n} checked={form === n} onChange={() => setForm(n)} className="sr-only" />
                        {n}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
      {state.saved && savedLabel && (
        <p role="status" className="rounded-[10px] bg-mint px-4 py-3 text-sm font-medium">
          {savedLabel}
        </p>
      )}
      <SubmitButton icon="/icons/arrow-right-white.svg">{submitLabel ?? (short ? format(t.continueTo, { level: short }) : t.continue)}</SubmitButton>
    </form>
  );
}
