import type { Riasec } from './scoring.js';

/**
 * What a programme specialises in, read from its name, with its own interest profile (RIASEC 1–5). A broad field
 * (Computing & IT) covers very different work: cyber security suits people who like to investigate, read and
 * follow procedure (Investigative, Conventional); multimedia suits Artistic people. Without this every programme
 * in a field had the same interest fit. Only names that clearly say so match; the rest keep the field's profile.
 */
export interface Specialisation {
  key: string;
  weights: Riasec;
}

// Most specific first: the first rule whose pattern matches the name wins.
const RULES: ReadonlyArray<{ key: string; pattern: RegExp; weights: Riasec }> = [
  { key: 'cyber_security', pattern: /keselamatan (komputer|siber|maklumat|rangkaian)|siber|cyber|forensi|security/i, weights: { R: 2, I: 5, A: 1, S: 1, E: 2, C: 5 } },
  { key: 'data_ai', pattern: /sains data|data science|analitik|analytics|kecerdasan buatan|kepintaran buatan|artificial intelligence|bioinformatik|statistik|aktuari/i, weights: { R: 1, I: 5, A: 2, S: 1, E: 2, C: 4 } },
  { key: 'software', pattern: /perisian|software|pembangunan aplikasi|pengaturcaraan|programming/i, weights: { R: 3, I: 5, A: 3, S: 1, E: 2, C: 4 } },
  { key: 'networks', pattern: /rangkaian|network|sistem komputer|telekomunikasi|komunikasi data/i, weights: { R: 4, I: 4, A: 1, S: 1, E: 2, C: 4 } },
  { key: 'creative_media', pattern: /multimedia|media interaktif|permainan|game|grafik|animasi|animation|reka bentuk|design|seni|kreatif/i, weights: { R: 2, I: 3, A: 5, S: 2, E: 2, C: 2 } },
  { key: 'information_systems', pattern: /sistem maklumat|information system|pengurusan pangkalan data|database|e-dagang|e-commerce/i, weights: { R: 2, I: 3, A: 1, S: 2, E: 4, C: 5 } },
  { key: 'accounting_finance', pattern: /perakaunan|accounting|kewangan|finance|perbankan|banking|audit|cukai/i, weights: { R: 1, I: 3, A: 1, S: 2, E: 4, C: 5 } },
  { key: 'management', pattern: /pengurusan|management|pentadbiran|keusahawanan|usahawan|entrepreneur|pemasaran|marketing|perniagaan|business|sumber manusia/i, weights: { R: 1, I: 2, A: 2, S: 4, E: 5, C: 4 } },
  { key: 'hospitality', pattern: /kulinari|culinary|hotel|hospitaliti|hospitality|pelancongan|tourism|katering|catering|makanan|food/i, weights: { R: 4, I: 2, A: 4, S: 4, E: 4, C: 2 } },
  { key: 'health_care', pattern: /kejururawatan|nursing|perubatan|medic|farmasi|pharma|fisioterapi|terapi|kesihatan|health/i, weights: { R: 3, I: 5, A: 1, S: 5, E: 2, C: 3 } },
  { key: 'education', pattern: /pendidikan|education|perguruan|teaching|tesl/i, weights: { R: 1, I: 3, A: 3, S: 5, E: 3, C: 3 } },
  { key: 'law_social', pattern: /undang-undang|law|psikologi|psychology|kaunseling|counsel|sosial|social|komunikasi|communication|kewartawanan|journalism/i, weights: { R: 1, I: 4, A: 3, S: 5, E: 4, C: 2 } },
  { key: 'engineering_hands_on', pattern: /mekanikal|mechanical|automotif|automotive|pembuatan|manufactur|awam|civil|elektrik|electrical|elektronik|electronic|mekatronik|mechatronic/i, weights: { R: 5, I: 4, A: 1, S: 1, E: 2, C: 3 } },
];

export function specialisationOf(programmeName: string): Specialisation | null {
  const rule = RULES.find((r) => r.pattern.test(programmeName));
  return rule ? { key: rule.key, weights: rule.weights } : null;
}

/**
 * The profile a programme is matched on: its specialisation's, leaning 60% on it and 40% on the broad field's
 * (the field still says what the programme is mostly about); the field's alone when the name says nothing more.
 */
export function programmeProfile(field: Riasec | null, specialisation: Specialisation | null): Riasec | null {
  if (!specialisation) return field;
  if (!field) return specialisation.weights;
  const keys = Object.keys(field) as Array<keyof Riasec>;
  return Object.fromEntries(keys.map((k) => [k, Math.round((0.6 * specialisation.weights[k] + 0.4 * field[k]) * 100) / 100])) as Riasec;
}
