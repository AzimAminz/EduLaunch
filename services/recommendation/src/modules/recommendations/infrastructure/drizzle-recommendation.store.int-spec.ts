import { randomUUID } from 'node:crypto';
import { connectTestDatabase } from '@edulaunch/nest-kit/testing';
import { inArray } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import type { RecommendationItem } from '../domain/recommendation-list.js';
import { SCORING_VERSION } from '../domain/recommendation-list.js';
import { DrizzleRecommendationStore } from './drizzle-recommendation.store.js';

const { db, close } = connectTestDatabase(schema);
const store = new DrizzleRecommendationStore(db);
const studentsUsed: string[] = [];

const item = (over: Partial<RecommendationItem> = {}): RecommendationItem => ({
  programId: randomUUID(),
  programName: 'Diploma Sains Komputer',
  eligibility: 'eligible',
  score: 70,
  offerChance: 'no_data',
  offerMargin: null,
  isTopMatch: false,
  isTargetBased: false,
  reasons: ['Mathematics A — minimum B'],
  missing: [],
  details: {
    institutionId: null,
    studyLevel: 'diploma',
    durationSemesters: 6,
    entryRoute: 'spm',
    entryRoutes: ['spm'],
    averageMerit: { intakeYear: 2026, value: 84.5 },
    interest: { fit: 0.81, level: 'high', sharedTypes: ['I', 'C'], fieldId: null },
    continuity: { score: 0.85, level: 'high', fieldMatch: 'same', textSimilarity: 0.6, qualification: 'diploma', name: 'Diploma Sains Komputer' },
    met: [{ type: 'min_grade', subjectId: null, required: 'B', actual: 'A', passed: true }],
    unmet: [],
    toConfirm: [],
  },
  ...over,
});

const newStudent = () => {
  const id = randomUUID();
  studentsUsed.push(id);
  return id;
};

afterAll(async () => {
  await db.delete(schema.recommendations).where(inArray(schema.recommendations.studentId, studentsUsed));
  await close();
});

describe('DrizzleRecommendationStore (integration)', () => {
  it('lists the top match first, then by score, with numbers and lists intact', async () => {
    const studentId = newStudent();
    const top = item({ score: 81, isTopMatch: true, offerChance: 'high', offerMargin: 3.5 });
    const second = item({ score: 90 });
    const third = item({ score: 40, eligibility: 'almost', missing: ['Physics needs C (you have D)'] });
    await store.replaceFor(studentId, [third, second, top]);

    const list = await store.listFor(studentId);
    expect(list.map((i) => i.programId)).toEqual([top.programId, second.programId, third.programId]);
    expect(list[0]).toEqual(top);
    expect(list[2]?.missing).toEqual(['Physics needs C (you have D)']);
  });

  it('keeps eligibility before score, and the card details as stored', async () => {
    const studentId = newStudent();
    const notYet = item({ score: 99, eligibility: 'not_yet', details: { ...item().details, unmet: [[{ type: 'min_cgpa', subjectId: null, required: 3, actual: 2.5, passed: false }]] } });
    const eligible = item({ score: 20 });
    await store.replaceFor(studentId, [notYet, eligible]);

    const list = await store.listFor(studentId);
    expect(list.map((i) => i.programId)).toEqual([eligible.programId, notYet.programId]);
    expect(list[1]?.details).toEqual(notYet.details);
    const status = await store.status(studentId);
    expect(status?.generatedAt).toBeInstanceOf(Date);
    expect(status?.scoringVersion).toBe(SCORING_VERSION);
    expect(await store.status(newStudent())).toBeNull();
  });

  it('replaces the whole list for a student, and leaves other students alone', async () => {
    const a = newStudent();
    const b = newStudent();
    await store.replaceFor(a, [item(), item()]);
    await store.replaceFor(b, [item()]);
    await store.replaceFor(a, [item({ score: 55 })]);

    expect(await store.listFor(a)).toHaveLength(1);
    expect(await store.listFor(b)).toHaveLength(1);
  });

  it('clears a list when given no items', async () => {
    const s = newStudent();
    await store.replaceFor(s, [item()]);
    await store.replaceFor(s, []);
    expect(await store.listFor(s)).toEqual([]);
  });

  it('finds every student who has a programme in their list', async () => {
    const programId = randomUUID();
    const x = newStudent();
    const y = newStudent();
    await store.replaceFor(x, [item({ programId })]);
    await store.replaceFor(y, [item({ programId }), item()]);
    await store.replaceFor(newStudent(), [item()]);

    expect((await store.studentsWithProgramme(programId)).sort()).toEqual([x, y].sort());
  });
});
