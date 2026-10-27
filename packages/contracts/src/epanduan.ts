/**
 * Institution codes on the JPT ePanduan site (online.mohe.gov.my/epanduan), as its "IPTA" filter lists them
 * (checked 27 Oct 2026). A programme code starts with its institution's code: UC6522001 is a UTeM programme.
 * Politeknik, Kolej Komuniti and MARA each share one code across all their colleges.
 */
export const EpanduanInstitutions = [
  { code: 'UM', name: 'Universiti Malaya' },
  { code: 'US', name: 'Universiti Sains Malaysia' },
  { code: 'UK', name: 'Universiti Kebangsaan Malaysia' },
  { code: 'UP', name: 'Universiti Putra Malaysia' },
  { code: 'UT', name: 'Universiti Teknologi Malaysia' },
  { code: 'UY', name: 'Universiti Islam Antarabangsa Malaysia' },
  { code: 'UW', name: 'Universiti Malaysia Sarawak' },
  { code: 'UH', name: 'Universiti Malaysia Sabah' },
  { code: 'UQ', name: 'Universiti Sains Islam Malaysia' },
  { code: 'UE', name: 'Universiti Teknologi MARA' },
  { code: 'UD', name: 'Universiti Sultan Zainal Abidin' },
  { code: 'UU', name: 'Universiti Utara Malaysia' },
  { code: 'UA', name: 'Universiti Pendidikan Sultan Idris' },
  { code: 'UG', name: 'Universiti Malaysia Terengganu' },
  { code: 'UL', name: 'Universiti Malaysia Kelantan' },
  { code: 'UZ', name: 'Universiti Pertahanan Nasional Malaysia' },
  { code: 'UB', name: 'Universiti Tun Hussein Onn Malaysia' },
  { code: 'UC', name: 'Universiti Teknikal Malaysia Melaka' },
  { code: 'UR', name: 'Universiti Malaysia Perlis' },
  { code: 'UJ', name: 'Universiti Malaysia Pahang Al-Sultan Abdullah' },
  { code: 'FB', name: 'Politeknik (semua)' },
  { code: 'FC', name: 'Kolej Komuniti (semua)' },
  { code: 'OP', name: 'MARA Bahagian Pendidikan Tinggi' },
] as const;

export type EpanduanCode = (typeof EpanduanInstitutions)[number]['code'];
export const EPANDUAN_CODE_PATTERN = /^[A-Z]{2}$/;
/** Codes that cover many colleges at once: found programmes must be picked by college name or campus. */
export const SharedEpanduanCodes: readonly string[] = ['FB', 'FC', 'OP'];
