import type { StudyLevel } from '@edulaunch/contracts';
import { format, type Dictionary } from '../i18n/locale';

/** The order levels appear in the "Level" filter. */
export const STUDY_LEVEL_OPTIONS: StudyLevel[] = ['form4_stream', 'certificate', 'skills', 'foundation', 'matriculation', 'diploma', 'degree'];

export function studyLevelLabel(level: StudyLevel, dict: Pick<Dictionary, 'levels'>): string {
  return dict.levels[level];
}

export function programmeMeta(level: StudyLevel, durationSemesters: number | null, dict: Pick<Dictionary, 'levels' | 'duration'>): string {
  const label = studyLevelLabel(level, dict);
  return durationSemesters ? `${label} • ${format(dict.duration, { years: durationSemesters / 2 })}` : label;
}

/** The six illustrations in public/illustrations/edu-worlds.png (3 columns × 2 rows). */
export type World = 'technology' | 'design' | 'science' | 'campus' | 'documents' | 'pathway';

export const WORLD_CELL: Record<World, { col: number; row: number }> = {
  technology: { col: 0, row: 0 },
  design: { col: 1, row: 0 },
  science: { col: 2, row: 0 },
  campus: { col: 0, row: 1 },
  documents: { col: 1, row: 1 },
  pathway: { col: 2, row: 1 },
};
