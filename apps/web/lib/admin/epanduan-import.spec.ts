import { describe, expect, it } from 'vitest';
import type { FoundProgramme, InstitutionProgramme } from './api';
import { acceptable, compareFound, draftFromFound, entryRoutesFromFound, onlyRoutesChanged, updateFromFound } from './epanduan-import';

const found = (over: Partial<FoundProgramme> = {}): FoundProgramme => ({
  code: 'UC6522001',
  name: 'Ijazah Sarjana Muda Kejuruteraan Elektrik dengan Kepujian',
  institutionName: 'Universiti Teknikal Malaysia Melaka',
  year: 2026,
  merit: 88.91,
  level: 'degree',
  levelText: 'Sarjana Muda',
  studyMode: 'conventional',
  durationSemesters: 8,
  necCode: '0712',
  necName: 'Kuasa Elektrik dan Tenaga',
  hasInterview: false,
  isStem: true,
  isTvet: false,
  bumiputeraOnly: false,
  feeder: false,
  isNew: false,
  note: null,
  campuses: ['Kampus Induk, Melaka'],
  careers: null,
  fees: null,
  routes: ['stpm'],
  categories: [{ jenprog: 'stpm', category: 'S', route: 'stpm', generalRequirements: null }],
  sourceUrl: 'https://online.mohe.gov.my/epanduan/ProgramPengajian/kategoriCalon/S',
  ...over,
});

const existing = (over: Partial<InstitutionProgramme> = {}): InstitutionProgramme => ({
  id: '00000000-0000-4000-8000-000000000001',
  upuCode: 'UC6522001',
  name: 'Ijazah Sarjana Muda Kejuruteraan Elektrik dengan Kepujian',
  studyLevel: 'degree',
  durationSemesters: 8,
  necCode: '0712',
  studyMode: 'conventional',
  campus: 'Kampus Induk, Melaka',
  hasInterview: false,
  isStem: true,
  isTvet: false,
  bumiputeraOnly: false,
  sourceUrl: null,
  status: 'published',
  pendingStatus: null,
  entryRoutes: ['stpm'],
  ...over,
});

const NEC = new Set(['0712', '0613']);
const NEC_FIELD = new Map<string, string | null>([
  ['0712', 'field-engineering'],
  ['0613', 'field-computing'],
]);

describe('compareFound', () => {
  it('marks each found programme new, changed or the same, matched by programme code', () => {
    const result = compareFound(
      [found(), found({ code: 'UC4481002', name: 'Diploma Sains Komputer', level: 'diploma', necCode: '0613' }), found({ code: 'UC6523003', durationSemesters: 9 })],
      [existing(), existing({ id: '00000000-0000-4000-8000-000000000003', upuCode: 'uc6523003' })],
      NEC,
    );
    expect(result.rows.map((r) => [r.found.code, r.status, r.changes])).toEqual([
      ['UC6522001', 'same', []],
      ['UC4481002', 'new', []],
      ['UC6523003', 'changed', ['durationSemesters']],
    ]);
    expect(result.counts).toEqual({ new: 1, changed: 1, same: 1, missing: 0 });
  });

  it('ignores letter case and unknown values, and flags catalogue programmes ePanduan no longer lists', () => {
    const result = compareFound(
      [found({ name: 'IJAZAH SARJANA MUDA KEJURUTERAAN ELEKTRIK DENGAN KEPUJIAN', durationSemesters: null, necCode: '9999' })],
      [existing(), existing({ id: '00000000-0000-4000-8000-000000000002', upuCode: 'UC0000001', name: 'Lama' }), existing({ upuCode: null, name: 'Tanpa kod' })],
      NEC,
    );
    expect(result.rows[0]).toMatchObject({ status: 'same', changes: [] });
    expect(result.missing.map((p) => p.name)).toEqual(['Lama']);
  });

  it('says why a row cannot be accepted now', () => {
    const rows = compareFound(
      [found({ code: 'UC1111111', level: null }), found({ durationSemesters: 9 }), found({ code: 'UC2222222', durationSemesters: 9 })],
      [existing({ pendingStatus: 'in_review' }), existing({ id: '00000000-0000-4000-8000-000000000004', upuCode: 'UC2222222', status: 'archived' })],
      NEC,
    ).rows;
    expect(rows.map((r) => r.problem)).toEqual(['no_level', 'change_in_review', 'archived']);
    expect(rows.map(acceptable)).toEqual([false, false, false]);
  });
});

describe('drafts and updates from ePanduan', () => {
  it('builds a draft with the code, the known NEC field and its broad field', () => {
    expect(draftFromFound(found(), NEC_FIELD)).toMatchObject({
      upuCode: 'UC6522001',
      studyLevel: 'degree',
      necCode: '0712',
      fieldIds: ['field-engineering'],
      campus: 'Kampus Induk, Melaka',
      hasInterview: false,
    });
    expect(draftFromFound(found({ necCode: '9999' }), NEC_FIELD)).toMatchObject({ necCode: null, fieldIds: [] });
  });

  it('updates only the changed fields and keeps the rest of an existing programme', () => {
    const current = { ...existing(), internalCode: 'BELG', faculty: 'FKE', fieldIds: ['field-other'] };
    const [row] = compareFound([found({ durationSemesters: 9, studyLevel: undefined } as Partial<FoundProgramme>)], [existing({ durationSemesters: 8 })], NEC).rows;
    const next = updateFromFound(current, row!, NEC_FIELD);
    expect(next).toMatchObject({ durationSemesters: 9, internalCode: 'BELG', faculty: 'FKE', fieldIds: ['field-other'] });
  });
});

describe('entry routes from ePanduan', () => {
  it('marks a programme changed when its routes differ, and keeps one route per category', () => {
    const many = found({
      routes: ['stpm', 'matrikulasi'],
      categories: [
        { jenprog: 'stpm', category: 'S', route: 'stpm', generalRequirements: null },
        { jenprog: 'stpm', category: 'N', route: 'matrikulasi', generalRequirements: null },
        { jenprog: 'stpm', category: 'T', route: null, generalRequirements: null },
      ],
    });
    const [row] = compareFound([many], [existing({ entryRoutes: ['stpm'] })], NEC).rows;
    expect(row).toMatchObject({ status: 'changed', changes: ['entryRoutes'] });
    expect(onlyRoutesChanged(row!)).toBe(true);
    expect(entryRoutesFromFound(many)).toEqual([
      { entryRoute: 'stpm', sourceCategory: 'stpm:S' },
      { entryRoute: 'matrikulasi', sourceCategory: 'stpm:N' },
    ]);
    expect(compareFound([many], [existing({ entryRoutes: ['matrikulasi', 'stpm'] })], NEC).rows[0]!.status).toBe('same');
  });
});
