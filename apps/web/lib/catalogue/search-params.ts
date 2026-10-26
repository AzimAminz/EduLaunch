import { StudyLevel } from '@edulaunch/contracts';
import { z } from 'zod';

export interface ProgrammeFilters {
  institutionId?: string;
  fieldId?: string;
  studyLevel?: StudyLevel;
  q?: string;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const uuid = z.uuid();

/** Reads filters from the URL. Invalid values are dropped, never errors, so a bad link still shows the directory. */
export function parseFilters(params: RawParams): ProgrammeFilters {
  const filters: ProgrammeFilters = { page: 1 };
  const institutionId = first(params.institutionId);
  const fieldId = first(params.fieldId);
  const studyLevel = first(params.studyLevel);
  const q = first(params.q)?.trim();
  const page = Number(first(params.page));

  if (institutionId && uuid.safeParse(institutionId).success) filters.institutionId = institutionId;
  if (fieldId && uuid.safeParse(fieldId).success) filters.fieldId = fieldId;
  if (studyLevel && StudyLevel.safeParse(studyLevel).success) filters.studyLevel = studyLevel as StudyLevel;
  if (q) filters.q = q.slice(0, 100);
  if (Number.isInteger(page) && page > 1) filters.page = page;
  return filters;
}

/** The query string for the same filters (no leading "?"). */
export function filtersToQuery(filters: ProgrammeFilters): string {
  const out = new URLSearchParams();
  if (filters.institutionId) out.set('institutionId', filters.institutionId);
  if (filters.fieldId) out.set('fieldId', filters.fieldId);
  if (filters.studyLevel) out.set('studyLevel', filters.studyLevel);
  if (filters.q) out.set('q', filters.q);
  if (filters.page > 1) out.set('page', String(filters.page));
  return out.toString();
}
