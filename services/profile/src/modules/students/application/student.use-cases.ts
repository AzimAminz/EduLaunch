import { Injectable } from '@nestjs/common';
import { NotFoundError, type UseCase } from '@edulaunch/ddd';
import type { Caller } from '@edulaunch/nest-kit';
import type { StudentSnapshot } from '@edulaunch/contracts';
import { randomUUID } from 'node:crypto';
import { Student, type EducationLevel } from '../domain/student.js';
import { StudentRepository } from '../domain/student.repository.js';
import { AcademicRecordRepository } from '../../academic-records/domain/academic-record.repository.js';

export interface MeView {
  studentId: string;
  educationLevel: EducationLevel | null;
  formYear: number | null;
  streamProgramId: string | null;
}

const toView = (s: Student): MeView => {
  const snap = s.toSnapshot();
  return { studentId: snap.id, educationLevel: snap.educationLevel, formYear: snap.formYear, streamProgramId: snap.streamProgramId };
};

/** Idempotent: the first call after sign-up creates the profile. */
@Injectable()
export class GetOrCreateMe implements UseCase<Caller, MeView> {
  constructor(private readonly students: StudentRepository) {}

  async execute(caller: Caller): Promise<MeView> {
    let student = await this.students.findByAccountId(caller.userId);
    if (!student) {
      student = Student.register(randomUUID(), caller.userId, null);
      await this.students.save(student);
    }
    return toView(student);
  }
}

@Injectable()
export class UpdateEducationLevel implements UseCase<{ caller: Caller; level: EducationLevel; formYear: number | null }, MeView> {
  constructor(
    private readonly students: StudentRepository,
    private readonly getOrCreate: GetOrCreateMe,
  ) {}

  async execute({ caller, level, formYear }: { caller: Caller; level: EducationLevel; formYear: number | null }): Promise<MeView> {
    await this.getOrCreate.execute(caller);
    const student = (await this.students.findByAccountId(caller.userId))!;
    student.setEducationLevel(level, formYear);
    await this.students.save(student);
    return toView(student);
  }
}

/** Read model for the recommendation service. */
@Injectable()
export class GetStudentSnapshot implements UseCase<{ studentId: string }, StudentSnapshot> {
  constructor(
    private readonly students: StudentRepository,
    private readonly records: AcademicRecordRepository,
  ) {}

  async execute({ studentId }: { studentId: string }): Promise<StudentSnapshot> {
    const student = await this.students.findById(studentId);
    if (!student) throw new NotFoundError('Student', studentId);
    const [record, riasec] = await Promise.all([this.records.findLatestConfirmed(studentId), this.students.latestRiasec(studentId)]);
    const r = record?.toSnapshot();
    return {
      studentId,
      educationLevel: student.educationLevel ?? 'after_spm',
      isTargetBased: r?.kind === 'target',
      gradeScale: r?.qualification ?? 'spm',
      grades: (r?.subjects ?? []).map((s) => ({ subjectId: s.subjectId, grade: s.grade })),
      cgpa: r?.cgpa ?? null,
      muetBand: r?.muetBand ?? null,
      riasec,
    };
  }
}
