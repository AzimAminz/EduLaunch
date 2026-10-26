import { randomUUID } from 'node:crypto';
import { connectTestDatabase } from '@edulaunch/nest-kit/testing';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../infrastructure/db/schema.js';
import { CatalogueSeeder } from './catalogue-seeder.js';
import { seedId } from './seed-id.js';
import type { SeedDataset } from './seed-types.js';

const { db, close } = connectTestDatabase(schema);
const seeder = new CatalogueSeeder(db);

// Unique keys so this test never collides with the real sample data.
const t = `it-${randomUUID().slice(0, 8)}`;
const tiny = (programmeName = `Diploma Ujian ${t}`): SeedDataset => ({
  institutions: [{ key: `${t}-inst`, name: `Kolej Contoh ${t}`, shortName: 'KCU', type: 'college', websiteUrl: null }],
  fields: [{ key: `${t}-field`, name: `Bidang ${t}`, riasec: { R: 1, I: 2, A: 3, S: 4, E: 5, C: 0 } }],
  subjects: [{ key: `${t}-math`, name: `Matematik ${t}`, qualification: 'spm', category: 'core', isMandatory: true }],
  programmes: [
    { key: `${t}-cert`, name: `Sijil Ujian ${t}`, institutionKey: `${t}-inst`, studyLevel: 'certificate', durationSemesters: 4, fieldKeys: [`${t}-field`] },
    { key: `${t}-dip`, name: programmeName, institutionKey: `${t}-inst`, studyLevel: 'diploma', durationSemesters: 6, fieldKeys: [`${t}-field`] },
  ],
  requirements: [
    { programmeKey: `${t}-dip`, entryRoute: 'spm', rules: [{ groupNo: 1, ruleType: 'min_grade', subjectKey: `${t}-math`, minGrade: 'C', evidenceQuote: '[Contoh] Kepujian Matematik' }] },
  ],
  pathways: [{ fromKey: `${t}-cert`, toKey: `${t}-dip`, conditionText: 'PNGK 2.50', minCgpa: 2.5 }],
  careers: [{ key: `${t}-career`, fieldKey: `${t}-field`, title: `Kerjaya ${t}`, description: 'Ujian', minStudyLevel: 'diploma' }],
  activities: [{ key: `${t}-act`, fieldKey: `${t}-field`, title: `Aktiviti ${t}`, type: 'puzzle' }],
  admissionStats: [{ programmeKey: `${t}-dip`, intakeYear: 2025, lowestMerit: 70.5, averageMerit: 78, applicants: 100, places: 20 }],
});

const ids = {
  institution: seedId(`institution:${t}-inst`),
  field: seedId(`field:${t}-field`),
  subject: seedId(`subject:${t}-math`),
  cert: seedId(`programme:${t}-cert`),
  dip: seedId(`programme:${t}-dip`),
};

afterAll(async () => {
  // Children first; program_field, rules and stats cascade or are removed with their parents.
  await db.delete(schema.programPathways).where(inArray(schema.programPathways.fromProgramId, [ids.cert, ids.dip]));
  await db.delete(schema.admissionStats).where(inArray(schema.admissionStats.programId, [ids.cert, ids.dip]));
  await db.delete(schema.requirements).where(inArray(schema.requirements.programId, [ids.cert, ids.dip]));
  await db.delete(schema.programs).where(inArray(schema.programs.id, [ids.cert, ids.dip]));
  await db.delete(schema.careers).where(eq(schema.careers.fieldId, ids.field));
  await db.delete(schema.activities).where(eq(schema.activities.fieldId, ids.field));
  await db.delete(schema.subjects).where(eq(schema.subjects.id, ids.subject));
  await db.delete(schema.fields).where(eq(schema.fields.id, ids.field));
  await db.delete(schema.institutions).where(eq(schema.institutions.id, ids.institution));
  await close();
});

const countFor = async () => ({
  programmes: (await db.select().from(schema.programs).where(inArray(schema.programs.id, [ids.cert, ids.dip]))).length,
  links: (await db.select().from(schema.programFields).where(inArray(schema.programFields.programId, [ids.cert, ids.dip]))).length,
  requirements: (await db.select().from(schema.requirements).where(eq(schema.requirements.programId, ids.dip))).length,
  pathways: (await db.select().from(schema.programPathways).where(eq(schema.programPathways.fromProgramId, ids.cert))).length,
  stats: (await db.select().from(schema.admissionStats).where(eq(schema.admissionStats.programId, ids.dip))).length,
});

describe('CatalogueSeeder (integration)', () => {
  it('inserts everything and reports what it wrote', async () => {
    const summary = await seeder.run(tiny());
    expect(summary).toMatchObject({ institutions: 1, fields: 1, subjects: 1, programmes: 2, requirements: 1, rules: 1, pathways: 1, careers: 1, activities: 1, admissionStats: 1 });
    expect(await countFor()).toEqual({ programmes: 2, links: 2, requirements: 1, pathways: 1, stats: 1 });
  });

  it('publishes seeded programmes and requirements, approved by a different admin than the preparer', async () => {
    const [p] = await db.select().from(schema.programs).where(eq(schema.programs.id, ids.dip));
    const [r] = await db.select().from(schema.requirements).where(eq(schema.requirements.programId, ids.dip));
    expect(p?.publishStatus).toBe('published');
    expect(r?.reviewStatus).toBe('published');
    expect(r?.approvedBy).not.toBe(r?.preparedBy);
  });

  it('can run again without creating duplicates, and applies changes', async () => {
    await seeder.run(tiny(`Diploma Ujian Dikemas Kini ${t}`));
    expect(await countFor()).toEqual({ programmes: 2, links: 2, requirements: 1, pathways: 1, stats: 1 });
    const [p] = await db.select().from(schema.programs).where(eq(schema.programs.id, ids.dip));
    expect(p?.name).toBe(`Diploma Ujian Dikemas Kini ${t}`);
  });

  it('stores numbers as numbers the repositories can read back', async () => {
    const [stat] = await db.select().from(schema.admissionStats).where(eq(schema.admissionStats.programId, ids.dip));
    expect(Number(stat?.lowestMerit)).toBe(70.5);
    const [path] = await db.select().from(schema.programPathways).where(eq(schema.programPathways.fromProgramId, ids.cert));
    expect(Number(path?.minCgpa)).toBe(2.5);
  });
});
