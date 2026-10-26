import { randomUUID } from 'node:crypto';
import { connectTestDatabase } from '@edulaunch/nest-kit/testing';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import { Requirement, type RequirementRule } from '../domain/requirement.js';
import { DrizzleRequirementRepository } from './drizzle-requirement.repository.js';

const { db, close } = connectTestDatabase(schema);
const repo = new DrizzleRequirementRepository(db);

const tag = `IT${randomUUID().slice(0, 8)}`;
const institutionId = randomUUID();
const programId = randomUUID();
const subjectId = randomUUID();

const rules = (minGrade = 'B'): RequirementRule[] => [
  { id: randomUUID(), groupNo: 1, ruleType: 'min_grade', subjectId, minGrade, minValue: null, evidenceQuote: 'sekurang-kurangnya gred B dalam Matematik' },
  { id: randomUUID(), groupNo: 2, ruleType: 'min_credits', subjectId: null, minGrade: 'C', minValue: 5, evidenceQuote: 'kepujian dalam lima mata pelajaran' },
];

async function newDraft(entryRoute: string, minGrade = 'B') {
  const versionNo = await repo.nextVersionNo(programId, entryRoute);
  const req = Requirement.draft(randomUUID(), { programId, entryRoute, versionNo, sourceId: null, sourceUrl: 'https://contoh.edu.my/syarat', preparedBy: randomUUID(), rules: rules(minGrade) });
  await repo.save(req);
  return req;
}

async function publish(req: Requirement) {
  req.submitForReview(req.toSnapshot().preparedBy);
  req.approve(randomUUID());
  await repo.save(req);
}

beforeAll(async () => {
  await db.insert(schema.institutions).values({ id: institutionId, name: `Universiti ${tag}`, type: 'public_university' });
  await db.insert(schema.subjects).values({ id: subjectId, name: `Matematik ${tag}`, qualification: 'spm' });
  await db.insert(schema.programs).values({ id: programId, institutionId, name: `Diploma ${tag}`, studyLevel: 'diploma' });
});

afterAll(async () => {
  await db.delete(schema.requirements).where(eq(schema.requirements.programId, programId));
  await db.delete(schema.programs).where(eq(schema.programs.id, programId));
  await db.delete(schema.subjects).where(eq(schema.subjects.id, subjectId));
  await db.delete(schema.institutions).where(inArray(schema.institutions.id, [institutionId]));
  await close();
});

describe('DrizzleRequirementRepository (integration)', () => {
  it('starts version numbers at 1 for each programme and entry route', async () => {
    expect(await repo.nextVersionNo(programId, 'stpm')).toBe(1);
  });

  it('saves a draft with its rules and reads it back unchanged', async () => {
    const req = await newDraft('spm');
    const found = (await repo.findById(req.id))!.toSnapshot();
    const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
    expect({ ...found, rules: [...found.rules].sort(byId) }).toEqual({ ...req.toSnapshot(), rules: [...req.rules].sort(byId) });
    expect(found.rules.find((r) => r.ruleType === 'min_credits')?.minValue).toBe(5); // numeric column comes back as a number
  });

  it('keeps the review status and approver after publishing', async () => {
    const req = await newDraft('spm');
    await publish(req);
    const found = (await repo.findById(req.id))!.toSnapshot();
    expect(found.status).toBe('published');
    expect(found.approvedBy).not.toBeNull();
  });

  it('returns only the latest published version for each entry route', async () => {
    const v = await newDraft('matrikulasi', 'C');
    await publish(v);
    const newer = await newDraft('matrikulasi', 'B');
    await publish(newer);
    await newDraft('matrikulasi', 'A'); // a draft must never be returned

    const published = await repo.findPublished([programId]);
    const matric = published.filter((r) => r.toSnapshot().entryRoute === 'matrikulasi');
    expect(matric).toHaveLength(1);
    expect(matric[0]!.id).toBe(newer.id);
    expect(published.some((r) => r.toSnapshot().entryRoute === 'spm')).toBe(true);
  });

  it('returns nothing for an empty list of programmes', async () => {
    expect(await repo.findPublished([])).toEqual([]);
  });

  it('finds the open draft and the latest published version of a route, and deletes a draft', async () => {
    const published = await newDraft('stpm', 'C');
    await publish(published);
    expect((await repo.findLatestPublished(programId, 'stpm'))?.id).toBe(published.id);
    expect(await repo.findOpen(programId, 'stpm')).toBeNull();
    const draft = await newDraft('stpm', 'B');
    expect((await repo.findOpen(programId, 'stpm'))?.id).toBe(draft.id);
    await repo.delete(draft.id);
    expect(await repo.findById(draft.id)).toBeNull();
    expect(await repo.findOpen(programId, 'stpm')).toBeNull();
  });

  it('knows which programmes and subjects exist, and each subject qualification', async () => {
    expect(await repo.programExists(programId)).toBe(true);
    expect(await repo.programExists(randomUUID())).toBe(false);
    expect(await repo.subjectQualifications([subjectId, randomUUID()])).toEqual(new Map([[subjectId, 'spm']]));
  });
});

