import { describe, expect, it } from 'vitest';
import type { PublishedRequirement, RequirementRuleDto } from '@edulaunch/contracts';
import en from '../../dictionaries/en.json';
import ms from '../../dictionaries/ms.json';
import { describeRequirement as describe_ } from './requirements';

const describeRequirement = (r: PublishedRequirement, n: ReadonlyMap<string, string>) => describe_(r, n, ms.requirements);

const ID = { bm: '00000000-0000-4000-8000-000000000001', math: '00000000-0000-4000-8000-000000000002', phy: '00000000-0000-4000-8000-000000000003', sci: '00000000-0000-4000-8000-000000000004', add: '00000000-0000-4000-8000-000000000005' };
const names = new Map([[ID.bm, 'Bahasa Melayu'], [ID.math, 'Matematik'], [ID.phy, 'Fizik'], [ID.sci, 'Sains'], [ID.add, 'Matematik Tambahan']]);

let n = 0;
const rule = (over: Partial<RequirementRuleDto>): RequirementRuleDto => ({
  id: `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`,
  groupNo: 1,
  ruleType: 'min_grade',
  subjectId: null,
  minGrade: null,
  minValue: null,
  evidenceQuote: '[Contoh] petikan',
  ...over,
});
const req = (rules: RequirementRuleDto[], entryRoute = 'spm'): PublishedRequirement => ({
  requirementId: '00000000-0000-4000-8000-0000000000aa',
  programId: '00000000-0000-4000-8000-0000000000bb',
  entryRoute,
  versionNo: 1,
  rules,
});

describe('describeRequirement', () => {
  it('turns a grade rule into "Subject: at least <grade>"', () => {
    const d = describeRequirement(req([rule({ subjectId: ID.math, minGrade: 'B' })]), names);
    expect(d.items).toEqual([{ title: 'Matematik', detail: 'Sekurang-kurangnya gred B' }]);
  });

  it('explains an either/or group in one item, sharing the grade when it is the same', () => {
    const d = describeRequirement(
      req([rule({ groupNo: 3, subjectId: ID.phy, minGrade: 'C' }), rule({ groupNo: 3, subjectId: ID.sci, minGrade: 'C' }), rule({ groupNo: 3, subjectId: ID.add, minGrade: 'C' })]),
      names,
    );
    expect(d.items).toEqual([{ title: 'Salah satu daripada', detail: 'Fizik, Sains atau Matematik Tambahan — sekurang-kurangnya gred C' }]);
  });

  it('lists each grade when the options need different grades', () => {
    const d = describeRequirement(req([rule({ groupNo: 2, subjectId: ID.phy, minGrade: 'B' }), rule({ groupNo: 2, subjectId: ID.sci, minGrade: 'C' })]), names);
    expect(d.items[0]).toEqual({ title: 'Salah satu daripada', detail: 'Fizik gred B atau Sains gred C' });
  });

  it('describes credits, CGPA and MUET in plain words', () => {
    const d = describeRequirement(
      req([
        rule({ groupNo: 1, ruleType: 'min_credits', minGrade: 'C', minValue: 5 }),
        rule({ groupNo: 2, ruleType: 'min_cgpa', minValue: 2.75 }),
        rule({ groupNo: 3, ruleType: 'min_muet', minValue: 3 }),
      ]),
      names,
    );
    expect(d.items).toEqual([
      { title: 'Kepujian', detail: 'Sekurang-kurangnya 5 subjek dengan gred C atau lebih baik' },
      { title: 'PNGK', detail: 'Sekurang-kurangnya 2.75' },
      { title: 'MUET', detail: 'Sekurang-kurangnya Band 3' },
    ]);
  });

  it('keeps groups in order and falls back to a neutral name for unknown subjects', () => {
    const d = describeRequirement(req([rule({ groupNo: 2, subjectId: ID.math, minGrade: 'C' }), rule({ groupNo: 1, subjectId: '00000000-0000-4000-8000-0000000000ff', minGrade: 'E' })]), names);
    expect(d.items.map((i) => i.title)).toEqual(['Subjek lain', 'Matematik']);
  });

  it('flags sample data and strips the [Contoh] marker from the quotes it returns', () => {
    const d = describeRequirement(req([rule({ subjectId: ID.bm, minGrade: 'C', evidenceQuote: '[Contoh] Kepujian dalam Bahasa Melayu.' })]), names);
    expect(d.isSample).toBe(true);
    expect(d.quotes).toEqual(['Kepujian dalam Bahasa Melayu.']);
    expect(describeRequirement(req([rule({ subjectId: ID.bm, minGrade: 'C', evidenceQuote: 'Kepujian dalam Bahasa Melayu.' })]), names).isSample).toBe(false);
  });

  it('names the entry route for students', () => {
    expect(describeRequirement(req([], 'spm'), names).entryRoute).toBe('Lepasan SPM');
    expect(describeRequirement(req([], 'diploma'), names).entryRoute).toBe('Lepasan Diploma');
    expect(describeRequirement(req([], 'form3'), names).entryRoute).toBe('Tingkatan 3 (pilihan aliran)');
    expect(describeRequirement(req([], 'other-route'), names).entryRoute).toBe('other-route');
  });

  it('speaks English with the English dictionary', () => {
    const d = describe_(
      req([rule({ groupNo: 1, subjectId: ID.math, minGrade: 'B' }), rule({ groupNo: 2, subjectId: ID.phy, minGrade: 'C' }), rule({ groupNo: 2, subjectId: ID.sci, minGrade: 'C' }), rule({ groupNo: 3, ruleType: 'min_credits', minGrade: 'C', minValue: 5 })], 'diploma'),
      names,
      en.requirements,
    );
    expect(d.entryRoute).toBe('After Diploma');
    expect(d.items).toEqual([
      { title: 'Matematik', detail: 'At least grade B' },
      { title: 'One of', detail: 'Fizik or Sains — at least grade C' },
      { title: 'Credits', detail: 'At least 5 subjects at grade C or better' },
    ]);
  });
});
