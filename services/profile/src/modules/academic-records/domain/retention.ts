import { CertificateQualifications, type HigherQualification, type RecordQualification } from '@edulaunch/contracts';
import type { EducationLevel } from '../../students/domain/student.js';
import type { RecordKind } from './academic-record.js';

/** Where a student is: their level, form (Form 1–5) and, after SPM, their qualification. */
export interface LevelState {
  level: EducationLevel;
  formYear: number | null;
  higherQualification: HigherQualification | null;
}

export interface RecordSummary {
  id: string;
  qualification: RecordQualification;
  kind: RecordKind;
  examYear: number | null;
}

/** Form 1 has this year's results only; Form 2 this year and last year; Form 3 three years. Newest first. */
export function schoolYearsFor(formYear: number, thisYear: number): number[] {
  return Array.from({ length: Math.min(Math.max(formYear, 1), 3) }, (_, i) => thisYear - i);
}

/** SPM, then certificate (Sijil, SVM, SKM), then pre-university or diploma. */
const levelStage: Record<EducationLevel, number> = { form1_3: 1, form4_5: 2, after_spm: 3, after_certificate: 4, after_preu: 5 };

function recordStage(r: RecordSummary): number {
  if (r.qualification === 'school') return 1;
  if (r.qualification === 'spm') return r.kind === 'target' ? 2 : 3;
  return (CertificateQualifications as readonly string[]).includes(r.qualification) ? 4 : 5;
}

/**
 * Which saved records no longer fit after a level change, so matching never uses results
 * a student only entered by mistake. Moving up keeps everything as history. Then:
 * - Moving down removes records of the higher stages (Form 5 → Form 3 removes SPM targets;
 *   after SPM → Form 5 removes the actual SPM results).
 * - Form 1–3 keeps only the school years of the chosen form (Form 2 → Form 1 removes last year's).
 * - Switching qualification within a stage after SPM (foundation → diploma, SVM → SKM) removes the other one;
 *   SPM, and a certificate when moving on to a diploma, stay.
 */
export function recordsToRemove(records: RecordSummary[], next: LevelState, thisYear: number): RecordSummary[] {
  const stage = levelStage[next.level];
  const schoolYears = next.level === 'form1_3' && next.formYear ? schoolYearsFor(next.formYear, thisYear) : null;
  return records.filter((r) => {
    if (recordStage(r) > stage) return true;
    if (schoolYears && r.qualification === 'school' && (r.examYear === null || !schoolYears.includes(r.examYear))) return true;
    if (stage >= 4 && recordStage(r) === stage && r.qualification !== next.higherQualification) return true;
    return false;
  });
}
