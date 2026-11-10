'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { finishInterestTest, saveInterestAnswer } from '@/lib/interests/actions';
import { FLAG, Rimau, STAR, Sprite, face } from './pixel';

const ANSWERS = [0, 1, 2, 3, 4] as const;
/** One colour per answer, from "strongly dislike" to "strongly like" (white text passes contrast on each). */
const TILE = ['bg-[#c2413b]', 'bg-[#b45a17]', 'bg-[#5f6b7f]', 'bg-[#2f7d8c]', 'bg-[#23825a]'];
const PER_LEVEL = 6;
const XP_PER_ANSWER = 10;

interface Props {
  locale: Locale;
  questions: Array<{ id: string; text: string }>;
  saved: Record<string, number>;
  progress: { current: number; flags: string[] };
  t: Dictionary['interest']['game'];
}

type Save = 'idle' | 'saving' | 'saved' | 'error';

/**
 * The interest test as a small pixel quest: five levels of six activities, a hero who hops forward with each answer,
 * XP, a flag to come back later, a level map to jump to any question, and back and skip. Every answer, the flags and
 * the question open are saved on the server as the student goes, so a reload or another device carries on in place.
 */
export function InterestTest({ locale, questions, saved, progress, t }: Props) {
  const router = useRouter();
  const total = questions.length;
  const levels = Math.ceil(total / PER_LEVEL);
  const [answers, setAnswers] = useState<Record<string, number>>(saved);
  const [flags, setFlags] = useState<string[]>(progress.flags);
  const [current, setCurrent] = useState(Math.min(progress.current, total - 1));
  const [started, setStarted] = useState(Object.keys(saved).length > 0);
  const [mapOpen, setMapOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [pressed, setPressed] = useState<number | null>(null);
  const [gain, setGain] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
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
  const level = Math.floor(current / PER_LEVEL);
  const levelStart = level * PER_LEVEL;
  const levelQuestions = questions.slice(levelStart, levelStart + PER_LEVEL);

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
    (index: number) => {
      if (index < 0 || index >= total || index === current) return;
      if (advance.current) clearTimeout(advance.current);
      setCurrent(index);
      setMapOpen(false);
      persist(null, { current: index, flags });
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
    const first = answers[question.id] === undefined;
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    setPressed(value);
    if (first) setGain((g) => g + 1);
    // A level is cleared when its six questions all have an answer.
    const cleared = first && levelQuestions.every((q) => next[q.id] !== undefined);
    if (cleared) setBanner(format(t.levelUp, { n: level + 1 }));
    const target = current + 1 < total && next[questions[current + 1]!.id] === undefined ? current + 1 : nextOpen(current, next);
    persist({ questionId: question.id, answer: value }, { current: target ?? current, flags });
    if (advance.current) clearTimeout(advance.current);
    advance.current = setTimeout(
      () => {
        setPressed(null);
        if (target === null) setReview(true);
        else setCurrent(target);
      },
      cleared ? 900 : 360,
    );
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

  // Keys: 1–5 answer, arrows move, F flags, M opens the map.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started || review || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], [role=dialog]')) return;
      if (e.key >= '1' && e.key <= '5') choose(Number(e.key) - 1);
      else if (e.key === 'ArrowRight') goTo(current + 1);
      else if (e.key === 'ArrowLeft') goTo(current - 1);
      else if (e.key === 'f' || e.key === 'F') toggleFlag();
      else if (e.key === 'm' || e.key === 'M') setMapOpen((o) => !o);
      else if (e.key === 'Escape' && mapOpen) setMapOpen(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 1600);
    return () => clearTimeout(id);
  }, [banner]);
  useEffect(() => () => void (advance.current && clearTimeout(advance.current)), []);

  const shell = 'relative flex flex-col gap-4 rounded-[8px] bg-[#13224a] p-4 text-white px-frame sm:p-6';

  if (!started)
    return (
      <section className={`${shell} items-center justify-center py-12 text-center`}>
        <div className="flex items-end gap-4">
          <Sprite rows={STAR} palette={{ Y: '#ffd84d' }} size={22} className="px-blink" />
          <Rimau height={140} />
          <Sprite rows={STAR} palette={{ Y: '#ffd84d' }} size={22} className="px-blink [animation-delay:500ms]" />
        </div>
        <h2 className="text-[36px] font-extrabold uppercase leading-none tracking-wide text-yellow sm:text-[48px]">{t.title}</h2>
        <p className="text-balance text-[18px] text-white/85">{t.startLine}</p>
        <ul className="flex flex-wrap justify-center gap-2 text-[15px]">
          {t.facts.map((f) => (
            <li key={f} className="rounded-[4px] bg-white/10 px-3 py-1.5">
              {f}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setStarted(true)} className="px-btn mt-2 rounded-[4px] bg-yellow px-10 py-3 text-[24px] font-bold uppercase text-navy">
          ▶ {t.start}
        </button>
      </section>
    );

  if (review)
    return (
      <Review
        t={t}
        shell={shell}
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
    <section className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      {/* Left: progress, level and XP, and every question to jump to. */}
      <aside className="relative flex flex-col gap-4 rounded-[8px] bg-[#13224a] p-4 text-white px-frame sm:p-5 lg:sticky lg:top-6">
        <div className="flex items-center gap-3">
          <div key={answered} className={answered ? 'px-hop' : ''}>
            <Rimau height={76} />
          </div>
          <div className="flex flex-col">
            <p className="text-[13px] text-white/60">{t.progress}</p>
            <p className="text-[24px] font-bold leading-none tabular-nums">
              {answered}
              <span className="text-[16px] font-semibold text-white/60">/{total}</span>
            </p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <span className="rounded-[4px] bg-yellow px-2 py-0.5 text-[13px] font-bold text-navy">{format(t.level, { n: level + 1, of: levels })}</span>
            <span className="relative text-[14px] font-bold tabular-nums text-yellow">
              {format(t.xp, { xp: answered * XP_PER_ANSWER })}
              {gain > 0 && (
                <span key={gain} aria-hidden className="px-float absolute -top-4 right-0 text-[13px] text-[#7ee2a8]">
                  +{XP_PER_ANSWER}
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[2px]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label={t.progress}>
          {questions.map((q) => (
            <span key={q.id} className={`h-2 ${answers[q.id] !== undefined ? 'bg-yellow' : 'bg-white/15'}`} />
          ))}
        </div>
        {banner && (
          <p role="status" className="px-banner self-center rounded-[4px] bg-yellow px-4 py-1 text-[16px] font-bold uppercase text-navy">
            {banner}
          </p>
        )}

        {/* The map: always on the left on a computer; folded on a phone. */}
        <button type="button" onClick={() => setMapOpen((o) => !o)} aria-expanded={mapOpen} aria-controls="quest-map" className="flex h-11 items-center justify-between rounded-[4px] bg-white/10 px-3 text-[15px] font-semibold hover:bg-white/20 lg:hidden">
          {t.mapTitle}
          <span aria-hidden className={`transition-transform ${mapOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
        <div className={`${mapOpen ? 'pop-open flex' : 'hidden'} lg:flex`}>
          <QuestMap questions={questions} answers={answers} flags={flags} current={current} t={t} onJump={goTo} />
        </div>

        <p className="min-h-5 text-[13px] text-white/60" role="status">
          {save === 'saving' ? t.saving : save === 'error' ? t.saveError : save === 'saved' ? t.saved : ''}
        </p>
        {allDone && (
          <button type="button" onClick={() => setReview(true)} className="px-btn h-12 rounded-[4px] bg-yellow px-5 text-[16px] font-bold uppercase text-navy">
            {t.review} ▶
          </button>
        )}
      </aside>

      {/* Right: the question and its answers. */}
      <div className="flex flex-col gap-5 rounded-[8px] bg-white p-5 text-navy px-frame sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-[4px] bg-blue px-2.5 py-1 text-[14px] font-bold text-[#2f5bd3]">{format(t.question, { n: current + 1 })}</span>
          <button
            type="button"
            onClick={toggleFlag}
            aria-pressed={flagged}
            className={`inline-flex h-10 items-center gap-1.5 rounded-[4px] px-3 text-[14px] font-semibold ${flagged ? 'bg-yellow' : 'bg-bg hover:bg-blue'}`}
          >
            <Sprite rows={FLAG} palette={{ K: '#0b1530', R: flagged ? '#c2413b' : '#8792a6' }} size={14} />
            {flagged ? t.flagged : t.flag}
          </button>
        </div>
        <div key={current} className="content-in flex flex-col gap-1">
          <p className="text-[14px] text-muted">{t.prompt}</p>
          <h2 className="text-[24px] font-bold leading-snug sm:text-[28px]">{question.text}</h2>
        </div>

        {/* Answers: chunky buttons that press down. */}
        <div role="radiogroup" aria-label={question.text} className="flex flex-col gap-3">
          {ANSWERS.map((a) => {
            const chosen = answers[question.id] === a;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={chosen}
                data-pressed={pressed === a}
                onClick={() => choose(a)}
                className={`px-btn flex min-h-[56px] items-center gap-3 rounded-[4px] px-4 py-2.5 text-left text-[17px] font-semibold text-white ${TILE[a]} ${chosen ? 'outline outline-4 outline-offset-2 outline-yellow' : ''}`}
              >
                <Sprite rows={face(a)} palette={{ K: '#ffffff' }} size={26} />
                <span className="flex-1">{t.scale[a]}</span>
                <kbd className="hidden rounded-[3px] bg-black/20 px-1.5 text-[12px] font-semibold sm:inline">{a + 1}</kbd>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4 text-[15px]">
          <button type="button" onClick={() => goTo(current - 1)} disabled={current === 0} className="h-11 rounded-[4px] bg-bg px-4 font-semibold hover:bg-blue disabled:opacity-40">
            ◀ {t.back}
          </button>
          <button type="button" onClick={() => goTo(current + 1)} disabled={current === total - 1} className="h-11 rounded-[4px] bg-bg px-4 font-semibold hover:bg-blue disabled:opacity-40">
            {t.skip} ▶
          </button>
        </div>
      </div>
    </section>
  );
}

/** Every question as a numbered tile, by level: answered, flagged, empty, and the one open. */
function QuestMap(props: { questions: Props['questions']; answers: Record<string, number>; flags: string[]; current: number; t: Props['t']; onJump: (i: number) => void }) {
  const { questions, answers, flags, current, t, onJump } = props;
  return (
    <div id="quest-map" className="flex w-full flex-col gap-2">
      <p className="hidden text-[13px] font-semibold uppercase tracking-wide text-white/60 lg:block">{t.mapTitle}</p>
      {Array.from({ length: Math.ceil(questions.length / PER_LEVEL) }, (_, lv) => (
        <div key={lv} className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-[12px] font-bold text-white/50">{format(t.levelShort, { n: lv + 1 })}</span>
          <ol className="grid flex-1 grid-cols-6 gap-1.5">
            {questions.slice(lv * PER_LEVEL, (lv + 1) * PER_LEVEL).map((q, j) => {
              const i = lv * PER_LEVEL + j;
              const done = answers[q.id] !== undefined;
              const flag = flags.includes(q.id);
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => onJump(i)}
                    aria-current={i === current ? 'step' : undefined}
                    aria-label={`${format(t.question, { n: i + 1 })}${done ? `, ${t.done}` : ''}${flag ? `, ${t.flagged}` : ''}`}
                    className={`grid h-9 w-full place-items-center rounded-[3px] text-[13px] font-bold tabular-nums transition-colors ${flag ? 'bg-yellow text-navy' : done ? 'bg-[#23825a]' : 'bg-white/10 hover:bg-white/20'} ${i === current ? 'outline outline-2 outline-offset-2 outline-white' : ''}`}
                  >
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[12px] text-white/70">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 bg-[#23825a]" /> {t.done}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 bg-yellow" /> {t.flagged}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 bg-white/15" /> {t.open}
        </span>
      </div>
    </div>
  );
}

/** Before the result: questions still open or flagged, each a tap away; the result once all are answered. */
function Review(props: { t: Props['t']; shell: string; total: number; answered: number; flagged: number[]; open: number[]; onOpen: (i: number) => void; onFinish: () => void; finishing: boolean; error: string | null }) {
  const { t, shell, total, answered, flagged, open, onOpen, onFinish, finishing, error } = props;
  const done = open.length === 0;
  const chips = (list: number[], tone: string) => (
    <ul className="flex flex-wrap justify-center gap-2">
      {list.map((i) => (
        <li key={i}>
          <button type="button" onClick={() => onOpen(i)} className={`h-10 min-w-10 rounded-[3px] px-3 text-[15px] font-bold tabular-nums ${tone}`}>
            {i + 1}
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <section className={`${shell} content-in items-center text-center`}>
      <div className={done ? 'px-hop' : ''}>
        <Rimau height={110} />
      </div>
      <p className="text-[16px] tabular-nums text-white/70">{format(t.answered, { count: answered, total })}</p>
      <h2 className="text-[30px] font-bold uppercase leading-tight text-yellow">{done ? t.reviewDone : t.reviewOpen}</h2>
      {open.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[15px] font-bold">{t.open}</p>
          {chips(open, 'bg-white/15 hover:bg-white/25')}
        </div>
      )}
      {flagged.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[15px] font-bold">{t.flagged}</p>
          {chips(flagged, 'bg-yellow text-navy')}
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-[4px] bg-[#c2413b] px-4 py-2 text-[15px]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => onOpen(open[0] ?? flagged[0] ?? 0)} className="h-12 rounded-[4px] bg-white/10 px-5 text-[16px] font-bold hover:bg-white/20">
          ◀ {t.reviewBack}
        </button>
        {done && (
          <button type="button" onClick={onFinish} disabled={finishing} className="px-btn h-12 rounded-[4px] bg-yellow px-6 text-[18px] font-bold uppercase text-navy disabled:opacity-60">
            {finishing ? t.saving : `${t.finish} ▶`}
          </button>
        )}
      </div>
    </section>
  );
}
