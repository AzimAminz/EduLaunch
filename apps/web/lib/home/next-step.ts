/**
 * The one thing the student home asks for next, in order of what unlocks the most: an education level, then (for Form
 * 1–3) the interest test before school results, since choosing a Form 4 stream rests on interests; for everyone else
 * results (and, after pre-university or a certificate, SPM too) before the interest test, since eligibility and merit
 * rest on results.
 */
export type NextStep =
  | { kind: 'level' }
  | { kind: 'interest'; answered: number; total: number }
  | { kind: 'results' }
  | { kind: 'spm' }
  | { kind: 'save' }
  | null;

export interface HomeState {
  level: string | null;
  /** Results the level's checks rest on are saved (school grades, SPM targets or results, or the CGPA). */
  hasResults: boolean;
  /** After pre-university or a certificate: no SPM results saved, though most programmes check SPM grades too. */
  spmMissing?: boolean;
  interest: { done: boolean; answered: number; total: number };
  savedCount: number;
  recommendationCount: number;
}

export function nextStep(s: HomeState): NextStep {
  if (!s.level) return { kind: 'level' };
  const interest: NextStep = s.interest.done ? null : { kind: 'interest', answered: s.interest.answered, total: s.interest.total };
  const results: NextStep = s.hasResults ? null : { kind: 'results' };
  const spm: NextStep = s.spmMissing ? { kind: 'spm' } : null;
  const order = s.level === 'form1_3' ? [interest, results] : [results, spm, interest];
  const first = order.find((step) => step !== null);
  if (first) return first;
  // Everything is in: keep a few programmes to follow (requirement changes are sent for saved ones).
  if (s.savedCount === 0 && s.recommendationCount > 0) return { kind: 'save' };
  return null;
}

/** "Selamat pagi" … by the hour in Malaysia, whatever the server's own time zone. */
export type DayPart = 'morning' | 'noon' | 'evening' | 'night';
export function dayPart(now: Date): DayPart {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kuala_Lumpur' }).format(now));
  return hour < 12 ? 'morning' : hour < 15 ? 'noon' : hour < 19 ? 'evening' : 'night';
}
