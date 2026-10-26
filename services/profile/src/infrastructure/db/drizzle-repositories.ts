import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '@edulaunch/nest-kit';
import type { RecordQualification } from '@edulaunch/contracts';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import * as schema from './schema.js';
import { Student } from '../../modules/students/domain/student.js';
import { StudentRepository } from '../../modules/students/domain/student.repository.js';
import { AcademicRecord, type RecordKind } from '../../modules/academic-records/domain/academic-record.js';
import { AcademicRecordRepository } from '../../modules/academic-records/domain/academic-record.repository.js';

const { accounts, students, academicRecords, recordSubjects, assessments } = schema;
const num = (v: string | null) => (v === null ? null : Number(v));

@Injectable()
export class DrizzleStudentRepository extends StudentRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {
    super();
  }

  async findById(id: string) {
    return this.findOne(eq(students.id, id));
  }

  async findByAccountId(accountId: string) {
    return this.findOne(eq(students.accountId, accountId));
  }

  async save(student: Student): Promise<void> {
    const s = student.toSnapshot();
    await this.db.transaction(async (tx) => {
      await tx.insert(accounts).values({ id: s.accountId, fullName: s.fullName }).onConflictDoNothing();
      const values = { id: s.id, accountId: s.accountId, educationLevel: s.educationLevel, formYear: s.formYear, streamProgramId: s.streamProgramId, parentConsentAt: s.parentConsentAt };
      await tx.insert(students).values(values).onConflictDoUpdate({ target: students.id, set: values });
    });
  }

  async latestRiasec(studentId: string) {
    const [row] = await this.db
      .select({ scores: assessments.riasecScores })
      .from(assessments)
      .where(and(eq(assessments.studentId, studentId), isNotNull(assessments.completedAt)))
      .orderBy(desc(assessments.completedAt))
      .limit(1);
    return row?.scores ?? null;
  }

  private async findOne(where: ReturnType<typeof eq>): Promise<Student | null> {
    const [row] = await this.db
      .select({ s: students, fullName: accounts.fullName })
      .from(students)
      .innerJoin(accounts, eq(accounts.id, students.accountId))
      .where(where)
      .limit(1);
    if (!row) return null;
    return Student.restore(row.s.id, {
      accountId: row.s.accountId,
      fullName: row.fullName,
      educationLevel: row.s.educationLevel,
      formYear: row.s.formYear,
      streamProgramId: row.s.streamProgramId,
      parentConsentAt: row.s.parentConsentAt,
    });
  }
}

@Injectable()
export class DrizzleAcademicRecordRepository extends AcademicRecordRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {
    super();
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(academicRecords).where(eq(academicRecords.id, id)).limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findLatestConfirmed(studentId: string) {
    const [row] = await this.db
      .select()
      .from(academicRecords)
      .where(and(eq(academicRecords.studentId, studentId), eq(academicRecords.recordStatus, 'confirmed')))
      .orderBy(desc(academicRecords.confirmedAt))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findCurrent(studentId: string, qualification: RecordQualification, kind: RecordKind, examYear: number | null = null) {
    const conditions = [eq(academicRecords.studentId, studentId), eq(academicRecords.qualification, qualification), eq(academicRecords.recordKind, kind)];
    if (kind === 'school') conditions.push(examYear === null ? isNull(academicRecords.examYear) : eq(academicRecords.examYear, examYear));
    const [row] = await this.db
      .select()
      .from(academicRecords)
      .where(and(...conditions))
      .orderBy(sql`${academicRecords.confirmedAt} desc nulls first`, academicRecords.id)
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async listByStudent(studentId: string) {
    const rows = await this.db
      .select()
      .from(academicRecords)
      .where(eq(academicRecords.studentId, studentId))
      .orderBy(sql`${academicRecords.examYear} desc nulls last`, academicRecords.recordKind, academicRecords.id);
    return Promise.all(rows.map((row) => this.toDomain(row)));
  }

  async save(record: AcademicRecord): Promise<void> {
    const s = record.toSnapshot();
    await this.db.transaction(async (tx) => {
      const values = {
        id: s.id,
        studentId: s.studentId,
        qualification: s.qualification,
        recordKind: s.kind,
        examYear: s.examYear,
        cgpa: s.cgpa === null ? null : String(s.cgpa),
        muetBand: s.muetBand === null ? null : String(s.muetBand),
        fieldId: s.fieldId,
        programmeName: s.programmeName,
        recordStatus: s.status,
        confirmedAt: s.confirmedAt,
      };
      await tx.insert(academicRecords).values(values).onConflictDoUpdate({ target: academicRecords.id, set: values });
      await tx.delete(recordSubjects).where(eq(recordSubjects.recordId, s.id));
      if (s.subjects.length) {
        await tx.insert(recordSubjects).values(
          s.subjects.map((x) => ({ recordId: s.id, subjectId: x.subjectId, grade: x.grade, customName: x.customName, readConfidence: x.readConfidence === null ? null : String(x.readConfidence) })),
        );
      }
    });
  }

  private async toDomain(row: typeof academicRecords.$inferSelect): Promise<AcademicRecord> {
    const subjects = await this.db.select().from(recordSubjects).where(eq(recordSubjects.recordId, row.id));
    return AcademicRecord.restore(row.id, {
      studentId: row.studentId,
      qualification: row.qualification as RecordQualification,
      kind: row.recordKind as RecordKind,
      examYear: row.examYear,
      cgpa: num(row.cgpa),
      muetBand: num(row.muetBand),
      fieldId: row.fieldId,
      programmeName: row.programmeName,
      subjects: subjects.map((x) => ({ subjectId: x.subjectId, grade: x.grade, customName: x.customName, readConfidence: num(x.readConfidence) })),
      status: row.recordStatus,
      confirmedAt: row.confirmedAt,
    });
  }
}
