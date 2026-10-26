'use client';

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import type { HigherQualification } from '@edulaunch/contracts';
import { chooseEducationLevel, previewEducationLevel } from '@/lib/auth/actions';
import type { RecordSummary } from '@/lib/profile/api';
import { EDUCATION_LEVELS, QUALIFICATION_CHOICES, asksQualification } from '@/lib/profile/levels';
import { historyKind } from '@/lib/profile/records';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, SubmitButton } from '@/components/auth/fields';
import { Notice } from '@/components/ui/notice';

type Level = (typeof EDUCATION_LEVELS)[number]['level'];

interface LevelPickerProps {
  locale: Locale;
  t: Dictionary['onboarding'];
  errors: Dictionary['auth']['errors'];
  /** Names shown in the dialog: the qualifications and the student's saved records. */
  names: { qualifications: Dictionary['higher']['qualifications']; records: Dictionary['academic']['history']['labels']; noYear: string };
  /** The profile page shows the current choice and stays put after saving; onboarding starts empty and goes on. */
  initial?: { level: Level | null; formYear: number | null; higherQualification: HigherQualification | null };
  /** Stay on this page after saving and show `savedLabel` (the profile page). Also checks which records would be removed. */
  savedLabel?: string;
  submitLabel?: string;
}

interface DialogState {
  /** null while the records are being checked. */
  remove: RecordSummary[] | null;
}

/**
 * "What is your education level now?" — one card per level; Form 1–3 and 4–5 also ask which form.
 * Before saving, a dialog asks which qualification (after pre-university or diploma) and lists any saved
 * records the change would delete, so the student confirms first.
 */
export function LevelPicker({ locale, t, errors, names, initial, savedLabel, submitLabel }: LevelPickerProps) {
  const [state, dispatch, pending] = useActionState(chooseEducationLevel, {});
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [level, setLevel] = useState<Level | null>(initial?.level ?? null);
  const [form, setForm] = useState<number | null>(initial?.formYear ?? null);
  const [higher, setHigher] = useState<HigherQualification | null>(initial?.higherQualification ?? null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [checkError, setCheckError] = useState<string | undefined>();

  const chosen = EDUCATION_LEVELS.find((l) => l.level === level);
  const short = chosen && (!chosen.forms || form) ? format(t.levels[chosen.level].short, { form: form ?? '' }) : null;
  const d = t.dialog;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (dialog && !el.open) el.showModal();
    if (!dialog && el.open) el.close();
  }, [dialog]);

  /** The form as it would be saved, optionally with another qualification (chosen in the dialog). */
  const formData = (qualification = higher) => {
    const data = new FormData(formRef.current!);
    data.set('higherQualification', qualification ?? '');
    return data;
  };

  const save = (qualification = higher) => {
    setDialog(null);
    const data = formData(qualification);
    startTransition(() => dispatch(data));
  };

  /** Asks the profile service which records this choice would delete. */
  async function check(qualification = higher) {
    setDialog({ remove: null });
    const result = await previewEducationLevel(formData(qualification));
    if ('error' in result) {
      setDialog(null);
      setCheckError(errors[result.error]);
      return;
    }
    setDialog({ remove: result.remove });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckError(undefined);
    if (asksQualification(level) && !higher) {
      // Ask the qualification first; the records are checked once it is chosen.
      setDialog({ remove: [] });
      return;
    }
    if (asksQualification(level)) return check();
    if (!savedLabel) return save();
    // The profile page: confirm only when something would be deleted.
    const result = await previewEducationLevel(formData());
    if ('error' in result) return save();
    if (result.remove.length) setDialog({ remove: result.remove });
    else save();
  }

  const choices = level ? QUALIFICATION_CHOICES[level] : undefined;
  const qualificationNeeded = !!choices && !higher;
  const alert = checkError ?? (!pending && state.error ? errors[state.error] : undefined);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="higherQualification" value={higher ?? ''} />
      {savedLabel && <input type="hidden" name="stay" value="1" />}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-xl font-semibold">{t.question}</legend>
        <p className="text-sm text-muted">{t.questionHint}</p>
        <FormAlert>{alert}</FormAlert>
        <div className="grid gap-3 sm:grid-cols-2">
          {EDUCATION_LEVELS.map(({ level: value, forms }) => {
            const selected = level === value;
            const copy = t.levels[value];
            return (
              <div key={value} className={`flex flex-col gap-2 rounded-[12px] border-2 p-3.5 transition-colors ${selected ? 'border-navy bg-blue' : 'border-transparent bg-bg'}`}>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="radio"
                    name="level"
                    value={value}
                    checked={selected}
                    onChange={() => {
                      setLevel(value);
                      setForm(null);
                      // A qualification belongs to one level; choosing another level asks again.
                      if (value !== level) setHigher(null);
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
                {selected && higher && QUALIFICATION_CHOICES[value]?.includes(higher) && <p className="pl-6 text-[13px] font-semibold">{names.qualifications[higher]}</p>}
              </div>
            );
          })}
        </div>
      </fieldset>
      <SubmitButton icon="/icons/arrow-right-white.svg" pending={pending}>
        {submitLabel ?? (short ? format(t.continueTo, { level: short }) : t.continue)}
      </SubmitButton>
      {savedLabel && <Notice showKey={state.savedAt}>{savedLabel}</Notice>}

      <dialog
        ref={dialogRef}
        aria-labelledby="level-dialog-title"
        onCancel={(e) => {
          e.preventDefault();
          setDialog(null);
        }}
        className="m-auto w-[min(520px,calc(100%-32px))] rounded-[18px] bg-white p-0 text-navy shadow-xl backdrop:bg-navy/40 open:animate-alert-in"
      >
        {dialog && (
          <div className="flex flex-col gap-5 p-6">
            <h2 id="level-dialog-title" className="text-xl font-semibold">
              {d.title}
            </h2>

            {choices && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 font-semibold">{d.qualificationQuestion}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {choices.map((q) => (
                    <label key={q} className={`flex cursor-pointer items-center gap-2.5 rounded-[12px] border-2 px-3.5 py-3 ${higher === q ? 'border-navy bg-blue' : 'border-transparent bg-bg'}`}>
                      <input
                        type="radio"
                        name="dialogQualification"
                        checked={higher === q}
                        onChange={() => {
                          setHigher(q);
                          void check(q);
                        }}
                        className="size-4 accent-navy"
                      />
                      <span className="font-semibold">{names.qualifications[q]}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[13px] text-muted">{d.qualificationHint}</p>
              </fieldset>
            )}

            {!qualificationNeeded &&
              (dialog.remove === null ? (
                <p className="text-sm text-muted">{d.checking}</p>
              ) : dialog.remove.length === 0 ? (
                <p className="text-sm text-muted">{d.noRemove}</p>
              ) : (
                <div className="flex flex-col gap-2 rounded-[12px] border border-red/40 bg-red/10 p-4">
                  <p className="font-semibold">{d.removeTitle}</p>
                  <ul className="list-disc pl-5 text-sm">
                    {dialog.remove.map((r) => (
                      <li key={r.id}>{format(names.records[historyKind(r)], { year: r.examYear ?? names.noYear })}</li>
                    ))}
                  </ul>
                  <p className="text-[13px]">{d.removeBody}</p>
                </div>
              ))}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDialog(null)} className="rounded-[10px] border border-line px-5 py-3 font-semibold hover:bg-bg">
                {d.cancel}
              </button>
              <button
                type="button"
                onClick={() => save()}
                disabled={qualificationNeeded || dialog.remove === null}
                className="rounded-[10px] bg-navy px-5 py-3 font-semibold text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {d.confirm}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </form>
  );
}
