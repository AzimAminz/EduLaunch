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

// Background colours follow the Figma cards: technology on blue, science on yellow, design on mint.
// Checked in priority order across all of a programme's fields: core sciences beat computing,
// computing beats engineering (so software engineering shows a laptop). "Sains Sosial" is deliberately not science.
const RULES: Array<{ match: RegExp; world: World; background: string }> = [
  { match: /design|seni|reka bentuk/i, world: 'design', background: '#ddf4e9' },
  { match: /pure science|sains tulen|health|kesihatan|perubatan|medic/i, world: 'science', background: '#ffd84d' },
  { match: /comput|komputer|\bIT\b|teknologi maklumat|technical|teknikal|vokasional/i, world: 'technology', background: '#e3ecff' },
  { match: /engineer|kejurutera/i, world: 'science', background: '#ffd84d' },
];

/** Chooses the card illustration from the programme's field names (first matching rule wins). */
export function worldForFields(fieldNames: string[]): { world: World; background: string } {
  for (const rule of RULES) {
    if (fieldNames.some((name) => rule.match.test(name))) return { world: rule.world, background: rule.background };
  }
  return { world: 'campus', background: '#fff4c7' };
}
