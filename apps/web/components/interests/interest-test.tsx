'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { saveInterestStep } from '@/lib/interests/actions';

const PER_STEP = 6;
const ANSWERS = [0, 1, 2, 3, 4] as const;

interface Props {
  locale: Locale;
  questions: Array<{ id: string; text: string }>;
  saved: Record<string, number>;
  t: Dictionary['interest']['test'];
}

/**
 * The interest test, six activities at a time. Each step is saved when the student moves on, so they can stop and
 * carry on later; the last step works out the result.
 */
export function InterestTest({ locale, questions, saved, t }: Props) {
  const router = useRouter();
  const steps = Math.ceil(questions.length / PER_STEP);
  const [answers, setAnswers] = useState<Record<string, number>>(saved);
  // Carry on from the first step with a question left.
  const firstOpen = questions.findIndex((q) => saved[q.id] === undefined);
  const [step, setStep] = useState(firstOpen < 0 ? steps - 1 : Math.floor(firstOpen / PER_STEP));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const top = useRef<HTMLDivElement>(null);

  const shown = questions.slice(step * PER_STEP, (step + 1) * PER_STEP);
  const stepDone = shown.every((q) => answers[q.id] !== undefined);
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const last = step === steps - 1;

  const go = (next: number) => {
    setStep(next);
    setError(null);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onNext = () => {
    if (!stepDone) return setError(t.answerAll);
    const batch = shown.map((q) => ({ questionId: q.id, answer: answers[q.id]! }));
    startTransition(async () => {
      const result = await saveInterestStep(locale, batch, last);
      if (!result.ok) return setError(result.error === 'incomplete' ? t.incomplete : t.saveError);
      if (last) {
        router.replace(`/${locale}/penilaian-minat`);
        router.refresh();
      } else go(step + 1);
    });
  };

  return (
    <div ref={top} className="flex scroll-mt-6 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <p className="font-semibold">{format(t.stepOf, { step: step + 1, steps })}</p>
          <p className="tabular-nums text-muted">{format(t.answered, { count: answered, total: questions.length })}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answered} aria-label={t.progress}>
          <div className="h-full rounded-full bg-navy transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(answered / questions.length) * 100}%` }} />
        </div>
      </div>

      <section className="flex flex-col rounded-[18px] bg-white p-5 sm:p-6">
        <p className="pb-2 text-sm text-muted">{t.prompt}</p>
        {shown.map((q, i) => {
          const n = step * PER_STEP + i + 1;
          return (
            <fieldset key={q.id} className="flex flex-col gap-3 border-t border-line py-5 first-of-type:border-0 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <legend className="contents">
                <span className="flex gap-3 text-[16px] font-semibold leading-snug lg:max-w-[420px]">
                  <span className="w-6 shrink-0 text-right tabular-nums text-muted">{n}.</span>
                  <span>{q.text}</span>
                </span>
              </legend>
              <div className="grid grid-cols-5 gap-1.5 pl-9 lg:w-[460px] lg:shrink-0 lg:pl-0">
                {ANSWERS.map((a) => {
                  const chosen = answers[q.id] === a;
                  return (
                    <label
                      key={a}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border px-1 py-2 text-center text-[12px] font-semibold leading-tight transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy/40 sm:text-[13px] ${
                        chosen ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-blue'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={a}
                        checked={chosen}
                        onChange={() => {
                          setAnswers((all) => ({ ...all, [q.id]: a }));
                          setError(null);
                        }}
                        className="sr-only"
                      />
                      {t.scale[a]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </section>

      {error && (
        <p role="alert" className="rounded-[12px] bg-[#fdecea] px-4 py-3 text-sm text-[#b33a35]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0 || pending}
          className="h-11 rounded-[12px] border border-line bg-white px-5 text-sm font-semibold transition-colors hover:bg-bg disabled:invisible"
        >
          ← {t.back}
        </button>
        <button type="button" onClick={onNext} disabled={pending} className="h-11 rounded-[12px] bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-60">
          {pending ? t.saving : last ? t.finish : `${t.next} →`}
        </button>
      </div>
      <p className="text-[13px] text-muted">{t.savedNote}</p>
    </div>
  );
}
