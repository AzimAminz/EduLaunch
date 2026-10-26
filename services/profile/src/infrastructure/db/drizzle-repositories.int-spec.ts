import { randomUUID } from 'node:crypto';
import { connectTestDatabase } from '@edulaunch/nest-kit/testing';
import { inArray } from 'drizzle-orm';
import * as schema from './schema.js';
import { DrizzleAcademicRecordRepository, DrizzleStudentRepository } from './drizzle-repositories.js';
import { Student } from '../../modules/students/domain/student.js';
import { AcademicRecord } from '../../modules/academic-records/domain/academic-record.js';

const { db, close } = connectTestDatabase(schema);
const students = new DrizzleStudentRepository(db);
const records = new DrizzleAcademicRecordRepository(db);

const accounts: string[] = [];
const subject = { math: randomUUID(), bm: randomUUID(), moral: randomUUID() };

async function newStudent(): Promise<Student> {
  const accountId = randomUUID();
  accounts.push(accountId);
  const s = Student.register(randomUUID(), accountId, 'Ujian Integrasi');
  await students.save(s);
  return s;
}

afterAll(async () => {
  // Deleting the account cascades to the student and everything they own.
  if (accounts.length) await db.delete(schema.accounts).where(inArray(schema.accounts.id, accounts));
  await close();
});

describe('DrizzleStudentRepository (integration)', () => {
  it('creates the account on first save and finds the student by account', async () => {
    const s = await newStudent();
    const found = await students.findByAccountId(s.accountId);
    expect(found?.id).toBe(s.id);
    expect(found?.toSnapshot().fullName).toBe('Ujian Integrasi');
  });

  it('updates the education level on a later save', async () => {
    const s = await newStudent();
    s.setEducationLevel('form4_5', 5);
    await students.save(s);
    const found = (await students.findById(s.id))!.toSnapshot();
    expect([found.educationLevel, found.formYear]).toEqual(['form4_5', 5]);
  });

  it('returns the latest completed interest result only', async () => {
    const s = await newStudent();
    expect(await students.latestRiasec(s.id)).toBeNull();

    const scores = { R: 3, I: 5, A: 1, S: 2, E: 1, C: 2 };
    await db.insert(schema.assessments).values([
      { studentId: s.id, instrumentVersion: 'v1', answers: {}, riasecScores: { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1 }, completedAt: new Date('2026-01-01') },
      { studentId: s.id, instrumentVersion: 'v1', answers: {}, riasecScores: scores, completedAt: new Date('2026-06-01') },
      { studentId: s.id, instrumentVersion: 'v1', answers: {}, riasecScores: null, completedAt: null }, // unfinished
    ]);
    expect(await students.latestRiasec(s.id)).toEqual(scores);
  });
});

describe('DrizzleAcademicRecordRepository (integration)', () => {
  it('saves subjects and replaces them when a subject is removed', async () => {
    const s = await newStudent();
    const r = AcademicRecord.start(randomUUID(), { studentId: s.id, qualification: 'spm', kind: 'actual', examYear: 2026 });
    r.setGrade(subject.math, 'A');
    r.setGrade(subject.moral, 'B');
    await records.save(r);

    r.removeSubject(subject.moral);
    r.setGrade(subject.bm, 'A+', 0.92);
    await records.save(r);

    const found = (await records.findById(r.id))!.toSnapshot();
    const bySubject = [...found.subjects].sort((a, b) => a.subjectId.localeCompare(b.subjectId));
    const expected = [
      { subjectId: subject.math, grade: 'A', readConfidence: null },
      { subjectId: subject.bm, grade: 'A+', readConfidence: 0.92 },
    ].sort((a, b) => a.subjectId.localeCompare(b.subjectId));
    expect(bySubject).toEqual(expected);
  });

  it('finds the latest confirmed record and ignores drafts', async () => {
    const s = await newStudent();
    const older = AcademicRecord.start(randomUUID(), { studentId: s.id, qualification: 'spm', kind: 'target', examYear: 2026 });
    older.setGrade(subject.math, 'B');
    older.confirm();
    await records.save(older);

    await new Promise((r) => setTimeout(r, 10));
    const newer = AcademicRecord.start(randomUUID(), { studentId: s.id, qualification: 'spm', kind: 'actual', examYear: 2026 });
    newer.setGrade(subject.math, 'A');
    newer.confirm();
    await records.save(newer);

    const draft = AcademicRecord.start(randomUUID(), { studentId: s.id, qualification: 'spm', kind: 'actual', examYear: 2026 });
    draft.setGrade(subject.math, 'A+');
    await records.save(draft);

    expect((await records.findLatestConfirmed(s.id))?.id).toBe(newer.id);
  });
});
