'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { finishInterestTest, saveInterestAnswer } from '@/lib/interests/actions';

const ANSWERS = [0, 1, 2, 3, 4] as const;
/** One colour per answer, from "strongly dislike" to "strongly like" (white text passes contrast on each). */
const TILE = ['bg-[#c2413b]', 'bg-[#b45a17]', 'bg-[#5f6b7f]', 'bg-[#2f7d8c]', 'bg-[#23825a]'];
const MILESTONES = [10, 20];

interface Props {
  locale: Locale;
  questions: Array<{ id: string; text: string }>;
  saved: Record<string, number>;
  progress: { current: number; flags: string[] };
  t: Dictionary['interest']['test'];
}

type Save = 'idle' | 'saving' | 'saved' | 'error';

/**
 * The interest test as a quiz: one activity at a time, big answer tiles (or keys 1–5), a flag to come back later, a
 * numbered map to jump to any question, and back and forward. Every answer, the flags and the question open are
 * saved on the server as the student goes, so a reload or another device carries on in the same place.
 */
export function InterestTest({ locale, questions, saved, progress, t }: Props) {
  const router = useRouter();
  const total = questions.length;
  const [answers, setAnswers] = useState<Record<string, number>>(saved);
  const [flags, setFlags] = useState<string[]>(progress.flags);
  const [current, setCurrent] = useState(Math.min(progress.current, total - 1));
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [mapOpen, setMapOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [popped, setPopped] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [save, setSave] = useState<Save>('idle');
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();
  // Saves go one after another, so the last one written is the last one made.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = questions[current]!;
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const allDone = answered === total;
  const flagged = flags.includes(question.id);

  const persist = useCallback(
    (answer: { questionId: string; answer: number } | null, next: { current: number; flags: string[] }) => {
      setSave('saving');
      queue.current = queue.current.then(async () => {
        const result = await saveInterestAnswer(locale, answer, next).catch(() => ({ ok: false as const }));
        setSave(result.ok ? 'saved' : 'error');
      });
    },
    [locale],
  );

  const goTo = useCallback(
    (index: number, opts: { save?: boolean } = {}) => {
      if (index < 0 || index >= total || index === current) return;
      if (advance.current) clearTimeout(advance.current);
      setDirection(index > current ? 'next' : 'prev');
      setCurrent(index);
      setMapOpen(false);
      if (opts.save !== false) persist(null, { current: index, flags });
    },
    [current, flags, persist, total],
  );

  /** The next question still without an answer after `from`, wrapping round; null when all are answered. */
  const nextOpen = (from: number, all: Record<string, number>) => {
    for (let step = 1; step <= total; step++) {
      const i = (from + step) % total;
      if (all[questions[i]!.id] === undefined) return i;
    }
    return null;
  };

  const choose = (value: number) => {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    setPopped(value);
    const count = questions.filter((q) => next[q.id] !== undefined).length;
    if (answers[question.id] === undefined && MILESTONES.includes(count)) setToast(format(t.milestone, { count, total }));
    // Move on to the next open question after a short beat, so the choice is seen.
    const target = current + 1 < total && next[questions[current + 1]!.id] === undefined ? current + 1 : nextOpen(current, next);
    persist({ questionId: question.id, answer: value }, { current: target ?? current, flags });
    if (advance.current) clearTimeout(advance.current);
    advance.current = setTimeout(() => {
      setPopped(null);
      if (target === null) setReview(true);
      else {
        setDirection(target > current ? 'next' : 'prev');
        setCurrent(target);
      }
    }, 320);
  };

  const toggleFlag = () => {
    const next = flagged ? flags.filter((id) => id !== question.id) : [...flags, question.id];
    setFlags(next);
    persist(null, { current, flags: next });
  };

  const finish = () => {
    setFinishError(null);
    startFinish(async () => {
      await queue.current;
      const result = await finishInterestTest(locale);
      if (!result.ok) return setFinishError(result.error === 'incomplete' ? t.incomplete : t.saveError);
      router.replace(`/${locale}/penilaian-minat?baru=1`);
      router.refresh();
    });
  };

  // Keys: 1–5 answer, arrows move, F flags.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (review || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], [role=dialog]')) return;
      if (e.key >= '1' && e.key <= '5') choose(Number(e.key) - 1);
      else if (e.key === 'ArrowRight') goTo(current + 1);
      else if (e.key === 'ArrowLeft') goTo(current - 1);
      else if (e.key === 'f' || e.key === 'F') toggleFlag();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => () => void (advance.current && clearTimeout(advance.current)), []);

  if (review)
    return (
      <Review
        t={t}
        total={total}
        answered={answered}
        flagged={flags.map((id) => questions.findIndex((q) => q.id === id)).filter((i) => i >= 0).sort((a, b) => a - b)}
        open={questions.map((q, i) => (answers[q.id] === undefined ? i : -1)).filter((i) => i >= 0)}
        onOpen={(i) => {
          setReview(false);
          goTo(i);
        }}
        onFinish={finish}
        finishing={finishing}
        error={finishError}
      />
    );

  return (
    <div className="flex flex-col gap-4">
      {/* The stage: progress, flag and the question map. */}
      <div className="relative flex flex-col gap-3 rounded-[22px] bg-navy p-4 text-white sm:p-5">
        <div className="flex items-center gap-3">
          <p className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold tabular-nums">{format(t.questionOf, { n: current + 1, total })}</p>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label={t.progress}>
            <div className="h-full origin-left rounded-full bg-yellow transition-transform duration-300 motion-reduce:transition-none" style={{ transform: `scaleX(${answered / total})` }} />
          </div>
          <p className="shrink-0 text-sm tabular-nums text-white/80">
            {answered}/{total}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SaveState state={save} t={t} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleFlag}
              aria-pressed={flagged}
              className={`inline-flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold transition-colors ${flagged ? 'bg-yellow text-navy' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <FlagIcon filled={flagged} />
              {flagged ? t.flagged : t.flag}
            </button>
            <button
              type="button"
              onClick={() => setMapOpen((o) => !o)}
              aria-expanded={mapOpen}
              aria-controls="quiz-map"
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-white/10 px-3 text-sm font-semibold transition-colors hover:bg-white/20"
            >
              <GridIcon />
              {t.map}
            </button>
          </div>
        </div>
        {mapOpen && (
          <QuestionMap
            questions={questions}
            answers={answers}
            flags={flags}
            current={current}
            t={t}
            onJump={(i) => goTo(i)}
            onReview={allDone ? () => setReview(true) : undefined}
          />
        )}
      </div>

      {/* The question: slides in from the side it came from. */}
      <section key={question.id} aria-live="polite" className={`flex flex-col gap-5 rounded-[22px] bg-white p-5 sm:p-7 ${direction === 'next' ? 'quiz-in-next' : 'quiz-in-prev'}`}>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-blue text-sm font-bold tabular-nums">{current + 1}</span>
          <div className="flex flex-col gap-1">
            <p className="text-[13px] font-semibold text-muted">{t.prompt}</p>
            <h2 className="text-[22px] font-bold leading-snug sm:text-[26px]">{question.text}</h2>
          </div>
        </div>
        <div role="radiogroup" aria-label={question.text} className="grid gap-2 sm:grid-cols-5">
          {ANSWERS.map((a) => {
            const chosen = answers[question.id] === a;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => choose(a)}
                className={`relative flex min-h-[52px] items-center gap-3 rounded-[14px] px-4 py-3 text-left text-[15px] font-semibold text-white transition-[transform,box-shadow] duration-150 active:scale-[0.97] sm:min-h-[96px] sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:text-center motion-reduce:transition-none ${TILE[a]} ${
                  chosen ? 'ring-4 ring-yellow ring-offset-2' : 'hover:-translate-y-0.5 hover:shadow-lg'
                } ${popped === a ? 'quiz-pop' : ''}`}
              >
                <Face level={a} />
                <span className="leading-tight">{t.scale[a]}</span>
                <kbd className="ml-auto rounded-md bg-white/20 px-1.5 text-[11px] font-semibold sm:absolute sm:right-2 sm:top-2 sm:ml-0">{a + 1}</kbd>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => goTo(current - 1)} disabled={current === 0} className="h-11 rounded-[12px] border border-line bg-white px-4 text-sm font-semibold transition-colors hover:bg-bg disabled:opacity-40">
          ← {t.back}
        </button>
        {allDone ? (
          <button type="button" onClick={() => setReview(true)} className="h-11 rounded-[12px] bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90">
            {t.reviewAction} →
          </button>
        ) : (
          <button type="button" onClick={() => goTo(current + 1)} disabled={current === total - 1} className="h-11 rounded-[12px] border border-line bg-white px-4 text-sm font-semibold transition-colors hover:bg-bg disabled:opacity-40">
            {t.skip} →
          </button>
        )}
      </div>
      <p className="hidden text-[12px] text-muted sm:block">{t.keys}</p>

      {toast && (
        <p role="status" className="quiz-toast pointer-events-none fixed inset-x-0 bottom-6 z-40 mx-auto w-fit rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </p>
      )}
    </div>
  );
}

function SaveState({ state, t }: { state: Save; t: Props['t'] }) {
  const text = state === 'saving' ? t.saving : state === 'saved' ? t.saved : state === 'error' ? t.saveError : t.autoSave;
  return (
    <p role="status" className={`text-[13px] ${state === 'error' ? 'text-[#ffb4ae]' : 'text-white/70'}`}>
      {text}
    </p>
  );
}

/** Every question as a numbered tile: answered, flagged, open, and the one on screen. */
function QuestionMap(props: {
  questions: Props['questions'];
  answers: Record<string, number>;
  flags: string[];
  current: number;
  t: Props['t'];
  onJump: (i: number) => void;
  onReview?: () => void;
}) {
  const { questions, answers, flags, current, t, onJump, onReview } = props;
  return (
    <div id="quiz-map" className="quiz-in-next flex flex-col gap-3 rounded-[16px] bg-white p-4 text-navy">
      <ol className="grid grid-cols-6 gap-2 sm:grid-cols-10">
        {questions.map((q, i) => {
          const done = answers[q.id] !== undefined;
          const flag = flags.includes(q.id);
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={i === current ? 'step' : undefined}
                aria-label={`${format(t.questionOf, { n: i + 1, total: questions.length })}${done ? `, ${t.legendDone}` : ''}${flag ? `, ${t.flagged}` : ''}`}
                className={`relative grid h-11 w-full place-items-center rounded-[10px] text-sm font-bold tabular-nums transition-colors ${
                  flag ? 'bg-yellow' : done ? 'bg-navy text-white' : 'border border-line bg-white hover:bg-blue'
                } ${i === current ? 'ring-2 ring-[#2f5bd3] ring-offset-2' : ''}`}
              >
                {i + 1}
                {flag && (
                  <span className="absolute -right-1 -top-1">
                    <FlagIcon filled small />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-navy" /> {t.legendDone}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-yellow" /> {t.flagged}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded border border-line" /> {t.legendOpen}
        </span>
        {onReview && (
          <button type="button" onClick={onReview} className="ml-auto text-sm font-semibold text-navy underline underline-offset-2">
            {t.reviewAction}
          </button>
        )}
      </div>
    </div>
  );
}

/** Before the result: what is still open or flagged, each a tap away; the result once all are answered. */
function Review(props: { t: Props['t']; total: number; answered: number; flagged: number[]; open: number[]; onOpen: (i: number) => void; onFinish: () => void; finishing: boolean; error: string | null }) {
  const { t, total, answered, flagged, open, onOpen, onFinish, finishing, error } = props;
  const done = open.length === 0;
  const chips = (list: number[], tone: string) => (
    <ul className="flex flex-wrap gap-2">
      {list.map((i) => (
        <li key={i}>
          <button type="button" onClick={() => onOpen(i)} className={`h-10 min-w-10 rounded-[10px] px-3 text-sm font-bold tabular-nums ${tone}`}>
            {i + 1}
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="quiz-in-next flex flex-col gap-5 rounded-[22px] bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-1">
        <p className="text-[13px] font-semibold text-muted">{format(t.answered, { count: answered, total })}</p>
        <h2 className="text-[24px] font-bold leading-tight">{done ? t.reviewDoneTitle : t.reviewOpenTitle}</h2>
        <p className="text-sm text-muted">{done ? t.reviewDoneBody : t.reviewOpenBody}</p>
      </div>
      {open.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{t.legendOpen}</p>
          {chips(open, 'border border-line bg-white hover:bg-blue')}
        </div>
      )}
      {flagged.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{t.flaggedList}</p>
          {chips(flagged, 'bg-yellow hover:brightness-95')}
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-[12px] bg-[#fdecea] px-4 py-3 text-sm text-[#b33a35]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(open[0] ?? flagged[0] ?? 0)} className="h-11 rounded-[12px] border border-line bg-white px-5 text-sm font-semibold hover:bg-bg">
          ← {t.reviewBack}
        </button>
        {done && (
          <button type="button" onClick={onFinish} disabled={finishing} className="h-11 rounded-[12px] bg-navy px-6 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60">
            {finishing ? t.saving : t.finish}
          </button>
        )}
      </div>
    </section>
  );
}

function FlagIcon({ filled, small }: { filled?: boolean; small?: boolean }) {
  const size = small ? 14 : 18;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={small ? 'text-navy' : ''}>
      <path d="M4 22V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

/** A simple face from frowning (0) to beaming (4), drawn so it costs nothing to load. */
function Face({ level }: { level: number }) {
  const mouth = ['M8 16.5q4-3 8 0', 'M8.5 16q3.5-1.5 7 0', 'M8.5 15.5h7', 'M8.5 14.5q3.5 2 7 0', 'M8 14q4 4 8 0'][level];
  return (
    <svg aria-hidden width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" />
      <path d={mouth} />
    </svg>
  );
}
