import type { StudyLevel } from './dto.js';
import type { RecordQualification } from './grade-scales.js';

/**
 * Entry routes a programme publishes requirements for: who is applying, with which results.
 * Certificate holders (Sijil, SVM, SKM) and DVM/DKM holders have their own routes; programmes that
 * publish none for them fall back to the SPM or diploma route (see the recommendation service).
 */
export const EntryRoutes = ['form3', 'spm', 'sijil', 'svm', 'skm', 'stpm', 'a_level', 'matrikulasi', 'diploma', 'dvm', 'dkm'] as const;
export type EntryRoute = (typeof EntryRoutes)[number];

export const isEntryRoute = (value: string): value is EntryRoute => (EntryRoutes as readonly string[]).includes(value);

/** The routes usually offered for a programme at this level, suggested first when an admin adds requirements. */
export const EntryRoutesByLevel: Record<StudyLevel, readonly EntryRoute[]> = {
  form4_stream: ['form3'],
  certificate: ['spm'],
  skills: ['spm', 'skm'],
  foundation: ['spm'],
  matriculation: ['spm'],
  stpm: ['spm'],
  diploma: ['spm', 'sijil', 'svm', 'skm', 'stpm'],
  degree: ['stpm', 'a_level', 'matrikulasi', 'diploma', 'dvm', 'dkm'],
};

/** Whose subjects a grade rule on this route can name: the route's own results, plus SPM after Form 5. */
export const RouteSubjectQualifications: Record<EntryRoute, readonly RecordQualification[]> = {
  form3: ['school'],
  spm: ['spm'],
  sijil: ['spm'],
  svm: ['spm'],
  skm: ['spm'],
  stpm: ['stpm', 'spm'],
  a_level: ['a_level', 'spm'],
  matrikulasi: ['matriculation', 'foundation', 'spm'],
  diploma: ['spm'],
  dvm: ['spm'],
  dkm: ['spm'],
};

/** Kinds of institution an admin can register. */
export const InstitutionTypes = [
  'public_university',
  'private_university',
  'polytechnic',
  'community_college',
  'matriculation_college',
  'vocational_college',
  'skills_institute',
  'private_college',
] as const;
export type InstitutionType = (typeof InstitutionTypes)[number];

/** How a programme is studied: on campus, work-based (2U2I / 3U1I) or by distance learning. */
export const StudyModes = ['conventional', 'work_based', 'distance'] as const;
export type StudyMode = (typeof StudyModes)[number];

/** Malaysian states and federal territories, for an institution's location. */
export const MalaysianStates = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'WP Kuala Lumpur',
  'WP Labuan',
  'WP Putrajaya',
] as const;

/** Kinds of official source an institution publishes its programmes in (its website is a field of its own). */
export const InstitutionSourceKinds = ['programme_page', 'prospectus', 'epanduan', 'other'] as const;
export type InstitutionSourceKind = (typeof InstitutionSourceKinds)[number];
