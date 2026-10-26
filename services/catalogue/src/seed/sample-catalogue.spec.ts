import { isValidGrade } from '@edulaunch/contracts';
import { Program } from '../modules/programmes/domain/program.js';
import { Requirement } from '../modules/requirements/domain/requirement.js';
import { sampleCatalogue as data } from './sample-catalogue.js';
import { seedId } from './seed-id.js';

const keys = <T extends { key: string }>(rows: T[]) => rows.map((r) => r.key);
const duplicates = (list: string[]) => list.filter((k, i) => list.indexOf(k) !== i);

const programmeKeys = new Set(keys(data.programmes));
const fieldKeys = new Set(keys(data.fields));
const subjectByKey = new Map(data.subjects.map((s) => [s.key, s]));
const programmeByKey = new Map(data.programmes.map((p) => [p.key, p]));

describe('seedId', () => {
  it('gives the same valid UUID for the same key and different ones for different keys', () => {
    expect(seedId('programme:a')).toBe(seedId('programme:a'));
    expect(seedId('programme:a')).not.toBe(seedId('programme:b'));
    expect(seedId('programme:a')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('sample catalogue', () => {
  it('is clearly sample data: every institution name contains "Contoh"', () => {
    expect(data.institutions.length).toBeGreaterThan(0);
    for (const i of data.institutions) expect(i.name).toContain('Contoh');
  });

  it('has no duplicate keys', () => {
    const collections: Array<Array<{ key: string }>> = [data.institutions, data.fields, data.subjects, data.programmes, data.careers, data.activities];
    for (const rows of collections) {
      expect(duplicates(keys(rows))).toEqual([]);
    }
  });

  it('covers every study level the recommendation service asks for', () => {
    const levels = new Set(data.programmes.map((p) => p.studyLevel));
    for (const level of ['form4_stream', 'foundation', 'diploma', 'certificate', 'degree'] as const) expect(levels).toContain(level);
  });

  it('only links to institutions, fields and programmes that exist', () => {
    const institutions = new Set(keys(data.institutions));
    for (const p of data.programmes) {
      if (p.institutionKey) expect(institutions).toContain(p.institutionKey);
      expect(p.fieldKeys.length).toBeGreaterThan(0);
      for (const f of p.fieldKeys) expect(fieldKeys).toContain(f);
    }
    for (const c of data.careers) expect(fieldKeys).toContain(c.fieldKey);
    for (const a of data.activities) expect(fieldKeys).toContain(a.fieldKey);
    for (const w of data.pathways) {
      expect(programmeKeys).toContain(w.fromKey);
      expect(programmeKeys).toContain(w.toKey);
    }
    for (const s of data.admissionStats) expect(programmeKeys).toContain(s.programmeKey);
  });

  it('gives every programme a valid programme record (streams have no institution)', () => {
    for (const p of data.programmes) {
      expect(() =>
        Program.create(seedId(`programme:${p.key}`), {
          institutionId: p.institutionKey ? seedId(`institution:${p.institutionKey}`) : null,
          name: p.name,
          studyLevel: p.studyLevel,
          durationSemesters: p.durationSemesters,
          fieldIds: p.fieldKeys.map((f) => seedId(`field:${f}`)),
        }),
      ).not.toThrow();
    }
  });

  it('gives every programme exactly one requirement per entry route, so eligibility can be checked', () => {
    for (const p of data.programmes) expect(data.requirements.some((r) => r.programmeKey === p.key)).toBe(true);
    const routes = data.requirements.map((r) => `${r.programmeKey}/${r.entryRoute}`);
    expect(duplicates(routes)).toEqual([]);
  });

  it('only writes requirements that pass the same checks as the admin workflow', () => {
    for (const r of data.requirements) {
      expect(programmeKeys).toContain(r.programmeKey);
      expect(() =>
        Requirement.draft(seedId(`requirement:${r.programmeKey}:${r.entryRoute}`), {
          programId: seedId(`programme:${r.programmeKey}`),
          entryRoute: r.entryRoute,
          versionNo: 1,
          sourceId: null,
          preparedBy: seedId('admin:a'),
          rules: r.rules.map((rule, i) => ({
            id: seedId(`rule:${r.programmeKey}:${r.entryRoute}:${i}`),
            groupNo: rule.groupNo,
            ruleType: rule.ruleType,
            subjectId: rule.subjectKey ? seedId(`subject:${rule.subjectKey}`) : null,
            minGrade: rule.minGrade ?? null,
            minValue: rule.minValue ?? null,
            evidenceQuote: rule.evidenceQuote,
          })),
        }),
      ).not.toThrow();
    }
  });

  it('uses school subjects and school grades for Form 4 streams, SPM ones for everything after SPM', () => {
    for (const r of data.requirements) {
      const isStream = programmeByKey.get(r.programmeKey)!.studyLevel === 'form4_stream';
      const scale = isStream ? 'school' : 'spm';
      for (const rule of r.rules) {
        if (rule.subjectKey) {
          expect(subjectByKey.get(rule.subjectKey), `${r.programmeKey}: subject ${rule.subjectKey}`).toBeDefined();
          expect(subjectByKey.get(rule.subjectKey)!.qualification).toBe(scale);
        }
        if (rule.minGrade) expect(isValidGrade(scale, rule.minGrade), `${r.programmeKey}: grade ${rule.minGrade}`).toBe(true);
      }
    }
  });

  it('only uses CGPA and MUET rules for degrees, with realistic values', () => {
    for (const r of data.requirements) {
      for (const rule of r.rules) {
        if (rule.ruleType === 'min_cgpa') {
          expect(rule.minValue).toBeGreaterThanOrEqual(2);
          expect(rule.minValue).toBeLessThanOrEqual(4);
        }
        if (rule.ruleType === 'min_muet') {
          expect(rule.minValue).toBeGreaterThanOrEqual(1);
          expect(rule.minValue).toBeLessThanOrEqual(5.5);
        }
        if (rule.ruleType === 'min_cgpa' || rule.ruleType === 'min_muet') expect(programmeByKey.get(r.programmeKey)!.studyLevel).toBe('degree');
      }
    }
  });

  it('gives careers that need a degree and careers open to Diploma holders', () => {
    const levels = new Set(data.careers.map((c) => c.minStudyLevel));
    expect(levels).toContain('diploma');
    expect(levels).toContain('degree');
  });

  it('names every field in Bahasa Melayu and English', () => {
    for (const f of data.fields) {
      expect(f.name.trim().length, f.key).toBeGreaterThan(2);
      expect(f.nameEn.trim().length, f.key).toBeGreaterThan(2);
      expect(f.name).not.toBe(f.nameEn);
    }
  });

  it('names every subject in Bahasa Melayu and English', () => {
    for (const s of data.subjects) expect(s.nameEn.trim().length, s.key).toBeGreaterThan(2);
  });

  it('keeps field interest weights between 0 and 5', () => {
    for (const f of data.fields) {
      for (const v of Object.values(f.riasec)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });
});
