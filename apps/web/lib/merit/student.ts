import 'server-only';
import { SpmStreams, cgpaMerit, diplomaMerit, spmMerit, suggestSpmStream, type SpmStream } from '@edulaunch/contracts';
import { cookies } from 'next/headers';
import { getReferenceData, localName } from '@/lib/catalogue/api';
import type { Locale } from '@/lib/i18n/locale';
import { getMe, listRecords } from '@/lib/profile/api';
import type { MeritMode } from './compare';

/** The co-curricular mark the student last set in Merit Lab (this browser only); full marks until then. */
export const KOKO_COOKIE = 'edulaunch_koko';

const CGPA_ROUTES = ['stpm', 'matriculation', 'foundation'];
const DIPLOMA_ROUTES = ['diploma', 'dvm', 'dkm'];

export interface MeritInputs {
  mode: MeritMode;
  basis: 'actual' | 'target' | 'none';
  /** SPM grades with the subject's official name and its name in the page language. */
  subjects: Array<{ name: string; label: string; grade: string }>;
  /** Every SPM subject, for Merit Lab's "add a subject". */
  catalogue: Array<{ name: string; label: string }>;
  cgpa: number | null;
  higherQualification: string | null;
  /** The student's education level (null before onboarding). */
  level: string | null;
  /** The co-curricular mark to start from. */
  cocurricular: number;
}

/**
 * What a student's merit is worked out from: after pre-university or a diploma, that qualification's CGPA;
 * otherwise SPM: Form 4–5 students' target grades first, everyone else's actual results first.
 */
export async function loadMeritInputs(token: string, locale: Locale): Promise<MeritInputs> {
  const [me, records, reference, jar] = await Promise.all([getMe(token), listRecords(token), getReferenceData(), cookies()]);
  const saved = Number.parseFloat(jar.get(KOKO_COOKIE)?.value ?? '');
  const cocurricular = Number.isFinite(saved) ? Math.min(Math.max(saved, 0), 10) : 10;
  const higher = me.higherQualification;
  const higherRecord = higher ? records.find((r) => r.qualification === higher) : undefined;
  if (higher && (CGPA_ROUTES.includes(higher) || DIPLOMA_ROUTES.includes(higher))) {
    return {
      mode: DIPLOMA_ROUTES.includes(higher) ? 'diploma' : 'cgpa',
      basis: higherRecord?.cgpa != null ? 'actual' : 'none',
      subjects: [],
      catalogue: [],
      cgpa: higherRecord?.cgpa ?? null,
      higherQualification: higher,
      level: me.educationLevel,
      cocurricular,
    };
  }
  const spmSubjects = reference.subjects.filter((s) => s.qualification === 'spm');
  const byId = new Map(spmSubjects.map((s) => [s.id, s]));
  const actual = records.find((r) => r.qualification === 'spm' && r.kind === 'actual');
  const target = records.find((r) => r.qualification === 'spm' && r.kind === 'target');
  // Form 4–5 plan with their targets (a trial result saved as actual does not replace them); others use real results.
  const useTarget = me.educationLevel === 'form4_5' ? !!target : !actual && !!target;
  const record = useTarget ? target : actual;
  return {
    mode: 'spm',
    basis: record ? (useTarget ? 'target' : 'actual') : 'none',
    subjects: (record?.subjects ?? []).flatMap((s) => {
      const subject = byId.get(s.subjectId);
      return subject ? [{ name: subject.name, label: localName(subject, locale), grade: s.grade }] : [];
    }),
    catalogue: spmSubjects.map((s) => ({ name: s.name, label: localName(s, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale)),
    cgpa: null,
    higherQualification: higher,
    level: me.educationLevel,
    cocurricular,
  };
}

/** The stream that gives these SPM results the best merit (ties go to the stream the subjects suggest). */
export function bestStream(results: Array<{ subject: string; grade: string }>): SpmStream {
  const streams = Object.keys(SpmStreams) as SpmStream[];
  return streams.reduce((best, s) => (spmMerit(results, s, 0).merit > spmMerit(results, best, 0).merit ? s : best), suggestSpmStream(results));
}

/** The student's merit from their profile, or null when there is nothing to work it out from. */
export function studentMerit(inputs: MeritInputs): number | null {
  if (inputs.mode === 'spm') {
    if (inputs.subjects.length === 0) return null;
    const results = inputs.subjects.map((s) => ({ subject: s.name, grade: s.grade }));
    return spmMerit(results, bestStream(results), inputs.cocurricular).merit;
  }
  if (inputs.cgpa === null) return null;
  return inputs.mode === 'cgpa' ? cgpaMerit(inputs.cgpa, inputs.cocurricular).merit : diplomaMerit(inputs.cgpa);
}
