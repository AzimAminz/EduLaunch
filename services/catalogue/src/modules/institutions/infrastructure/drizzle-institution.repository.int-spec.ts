import { randomUUID } from 'node:crypto';
import { connectTestDatabase } from '@edulaunch/nest-kit/testing';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import { DrizzleInstitutionRepository } from './drizzle-institution.repository.js';

const { db, close } = connectTestDatabase(schema);
const repo = new DrizzleInstitutionRepository(db);

const tag = `IT${randomUUID().slice(0, 8)}`;
const institutionId = randomUUID();
const other = randomUUID();
const [p1, p2, outside] = [randomUUID(), randomUUID(), randomUUID()];

beforeAll(async () => {
  await db.insert(schema.institutions).values([
    { id: institutionId, name: `Universiti ${tag}`, type: 'public_university' },
    { id: other, name: `Kolej ${tag}`, type: 'private_college' },
  ]);
  await db.insert(schema.programs).values([
    { id: p1, institutionId, name: `Diploma A ${tag}`, studyLevel: 'diploma', publishStatus: 'published' },
    { id: p2, institutionId, name: `Ijazah B ${tag}`, studyLevel: 'degree', publishStatus: 'draft' },
    { id: outside, institutionId: other, name: `Ijazah C ${tag}`, studyLevel: 'degree', publishStatus: 'published' },
  ]);
  const [req] = await db.insert(schema.requirements).values({ programId: p1, preparedBy: randomUUID(), entryRoute: 'spm', versionNo: 1 }).returning();
  await db.insert(schema.requirementRules).values({ requirementId: req!.id, groupNo: 1, ruleType: 'min_cgpa', minValue: '2.00', evidenceQuote: 'PNGK 2.00' });
  await db.insert(schema.admissionStats).values({ programId: p1, intakeYear: 2026, averageMerit: '90.10' });
  // A pathway from another institution's programme into this one goes too, so nothing points at a deleted programme.
  await db.insert(schema.programPathways).values({ fromProgramId: outside, toProgramId: p2 });
  await repo.addSource(institutionId, { kind: 'prospectus', url: 'https://contoh.edu.my/prospektus.pdf', label: null });
});

afterAll(async () => {
  await db.delete(schema.programs).where(inArray(schema.programs.id, [p1, p2, outside]));
  await db.delete(schema.institutions).where(inArray(schema.institutions.id, [institutionId, other]));
  await close();
});

describe('DrizzleInstitutionRepository (integration)', () => {
  it('counts published programmes only', async () => {
    expect(await repo.countPublishedProgrammes(institutionId)).toBe(1);
  });

  it('deletes the institution with its programmes, requirements, rules, figures, pathways and sources', async () => {
    expect((await repo.deleteWithProgrammes(institutionId)).sort()).toEqual([p1, p2].sort());
    expect(await db.select().from(schema.institutions).where(eq(schema.institutions.id, institutionId))).toEqual([]);
    expect(await db.select().from(schema.programs).where(inArray(schema.programs.id, [p1, p2]))).toEqual([]);
    expect(await db.select().from(schema.requirements).where(eq(schema.requirements.programId, p1))).toEqual([]);
    expect(await db.select().from(schema.admissionStats).where(eq(schema.admissionStats.programId, p1))).toEqual([]);
    expect(await db.select().from(schema.programPathways).where(eq(schema.programPathways.fromProgramId, outside))).toEqual([]);
    expect(await db.select().from(schema.institutionSources).where(eq(schema.institutionSources.institutionId, institutionId))).toEqual([]);
    // The other institution's programme stays.
    expect(await db.select({ id: schema.programs.id }).from(schema.programs).where(eq(schema.programs.id, outside))).toEqual([{ id: outside }]);
  });
});
