import type { FoundProgramme, InstitutionProgramme, ProgrammeBody } from './api';

/**
 * Programmes found on ePanduan next to the institution's programmes in the catalogue, matched by programme code.
 * Each found programme is new, changed (its details differ) or the same; catalogue programmes with a code that
 * ePanduan no longer lists are "missing" and only flagged, never archived automatically (the page may have failed).
 */
export type ImportStatus = 'new' | 'changed' | 'same';

/** The details an import compares and may update. */
export const ComparedFields = ['name', 'studyLevel', 'durationSemesters', 'necCode', 'studyMode', 'campus', 'hasInterview', 'isStem', 'isTvet', 'bumiputeraOnly'] as const;
export type ComparedField = (typeof ComparedFields)[number];

/** Why a found programme cannot be accepted now. */
export type ImportProblem = 'no_level' | 'in_review' | 'change_in_review' | 'archived';

export interface ImportRow {
  found: FoundProgramme;
  existing: InstitutionProgramme | null;
  status: ImportStatus;
  changes: ComparedField[];
  problem: ImportProblem | null;
}

export interface ImportComparison {
  rows: ImportRow[];
  missing: InstitutionProgramme[];
  counts: Record<ImportStatus | 'missing', number>;
}

const campusText = (campuses: string[]) => (campuses.length ? campuses.join('; ') : null);

/** The found programme's values in catalogue terms (unknown values are null and never count as a change). */
function foundValues(f: FoundProgramme, knownNec: ReadonlySet<string>): Record<ComparedField, unknown> {
  return {
    name: f.name,
    studyLevel: f.level,
    durationSemesters: f.durationSemesters,
    necCode: f.necCode && knownNec.has(f.necCode) ? f.necCode : null,
    studyMode: f.studyMode,
    campus: campusText(f.campuses),
    hasInterview: f.hasInterview,
    isStem: f.isStem,
    isTvet: f.isTvet,
    bumiputeraOnly: f.bumiputeraOnly,
  };
}

const same = (a: unknown, b: unknown) => (typeof a === 'string' && typeof b === 'string' ? a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase() : a === b);

export function compareFound(found: FoundProgramme[], existing: InstitutionProgramme[], knownNec: ReadonlySet<string>): ImportComparison {
  const byCode = new Map(existing.filter((p) => p.upuCode).map((p) => [p.upuCode!.toUpperCase(), p]));
  const rows: ImportRow[] = found.map((f) => {
    const match = byCode.get(f.code) ?? null;
    if (!match) return { found: f, existing: null, status: 'new', changes: [], problem: f.level ? null : 'no_level' };
    const values = foundValues(f, knownNec);
    const changes = ComparedFields.filter((key) => values[key] !== null && values[key] !== undefined && !same(values[key], match[key]));
    const problem: ImportProblem | null =
      changes.length === 0
        ? null
        : match.status === 'in_review'
          ? 'in_review'
          : match.pendingStatus === 'in_review'
            ? 'change_in_review'
            : match.status === 'archived'
              ? 'archived'
              : null;
    return { found: f, existing: match, status: changes.length ? 'changed' : 'same', changes, problem };
  });
  const foundCodes = new Set(found.map((f) => f.code));
  const missing = existing.filter((p) => p.upuCode && !foundCodes.has(p.upuCode.toUpperCase()) && p.status !== 'archived');
  const counts = { new: 0, changed: 0, same: 0, missing: missing.length };
  for (const r of rows) counts[r.status] += 1;
  return { rows, missing, counts };
}

/** Rows an admin may accept now: new programmes with a level, and changes to programmes that can be edited. */
export const acceptable = (row: ImportRow) => row.status !== 'same' && row.problem === null;

/**
 * A new draft from a found programme. The NEC code is kept only when the catalogue knows it, and it suggests the
 * broad EduLaunch field (as in the programme form).
 */
export function draftFromFound(f: FoundProgramme, necField: ReadonlyMap<string, string | null>): ProgrammeBody & { studyLevel: NonNullable<FoundProgramme['level']> } {
  const nec = f.necCode && necField.has(f.necCode) ? f.necCode : null;
  const field = nec ? necField.get(nec) : null;
  return {
    name: f.name,
    studyLevel: f.level!,
    durationSemesters: f.durationSemesters,
    fieldIds: field ? [field] : [],
    upuCode: f.code,
    internalCode: null,
    faculty: null,
    necCode: nec,
    studyMode: f.studyMode,
    campus: campusText(f.campuses),
    hasInterview: f.hasInterview ?? false,
    isStem: f.isStem,
    isTvet: f.isTvet,
    bumiputeraOnly: f.bumiputeraOnly,
    sourceUrl: f.sourceUrl,
  };
}

/** An existing programme's details with only the changed fields taken from ePanduan (everything else kept). */
export function updateFromFound<T extends ProgrammeBody & { studyLevel?: string }>(current: T, row: ImportRow, necField: ReadonlyMap<string, string | null>): T {
  const draft = draftFromFound(row.found, necField);
  const next = { ...current };
  for (const key of row.changes) {
    if (key === 'studyLevel') continue; // the level of a published programme never changes through an import
    (next as Record<string, unknown>)[key] = draft[key];
  }
  if (row.changes.includes('necCode') && draft.fieldIds.length && !current.fieldIds.includes(draft.fieldIds[0]!)) {
    next.fieldIds = [...current.fieldIds, draft.fieldIds[0]!].slice(0, 10);
  }
  return next;
}
