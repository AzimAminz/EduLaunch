import { Injectable } from '@nestjs/common';
import { NotFoundError, type UseCase } from '@edulaunch/ddd';
import type { Caller } from '@edulaunch/nest-kit';
import { HigherQualifications, hasSubjectGrades, type HigherQualification, type StudentSnapshot } from '@edulaunch/contracts';
import { randomUUID } from 'node:crypto';
import { Student, type EducationLevel } from '../domain/student.js';
import { StudentRepository } from '../domain/student.repository.js';
import { AcademicRecordRepository } from '../../academic-records/domain/academic-record.repository.js';
import type { AcademicRecord } from '../../academic-records/domain/academic-record.js';
import { recordsToRemove, type RecordSummary } from '../../academic-records/domain/retention.js';

export interface MeView {
  studentId: string;
  educationLevel: EducationLevel | null;
  formYear: number | null;
  higherQualification: HigherQualification | null;
  streamProgramId: string | null;
}

const toView = (s: Student): MeView => {
  const snap = s.toSnapshot();
  return { studentId: snap.id, educationLevel: snap.educationLevel, formYear: snap.formYear, higherQualification: snap.higherQualification, streamProgramId: snap.streamProgramId };
};

export interface LevelChange {
  caller: Caller;
  level: EducationLevel;
  formYear: number | null;
  higherQualification: HigherQualification | null;
}

const summary = (r: AcademicRecord): RecordSummary => {
  const s = r.toSnapshot();
  return { id: s.id, qualification: s.qualification, kind: s.kind, examYear: s.examYear };
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

/**
 * Which saved records a level change would remove (see retention.ts), so the student can confirm first.
 * Checks the new level the same way saving does, without saving anything.
 */
@Injectable()
export class PreviewLevelChange implements UseCase<LevelChange, { remove: RecordSummary[] }> {
  constructor(
    private readonly getOrCreate: GetOrCreateMe,
    private readonly records: AcademicRecordRepository,
  ) {}

  async execute({ caller, level, formYear, higherQualification }: LevelChange) {
    const { studentId } = await this.getOrCreate.execute(caller);
    const probe = Student.register(studentId, caller.userId, null);
    probe.setEducationLevel(level, formYear, higherQualification);
    const records = (await this.records.listByStudent(studentId)).map(summary);
    return { remove: recordsToRemove(records, { level, formYear: probe.formYear, higherQualification: probe.higherQualification }, new Date().getFullYear()) };
  }
}

/** Sets the level and removes the records that no longer fit it (the student has seen them in the preview). */
@Injectable()
export class UpdateEducationLevel implements UseCase<LevelChange, MeView> {
  constructor(
    private readonly students: StudentRepository,
    private readonly getOrCreate: GetOrCreateMe,
    private readonly records: AcademicRecordRepository,
  ) {}

  async execute({ caller, level, formYear, higherQualification }: LevelChange): Promise<MeView> {
    await this.getOrCreate.execute(caller);
    const student = (await this.students.findByAccountId(caller.userId))!;
    student.setEducationLevel(level, formYear, higherQualification);
    const records = (await this.records.listByStudent(student.id)).map(summary);
    const remove = recordsToRemove(records, { level, formYear: student.formYear, higherQualification: student.higherQualification }, new Date().getFullYear());
    await this.records.deleteMany(remove.map((r) => r.id));
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
    const [records, riasec] = await Promise.all([this.records.listByStudent(studentId), this.students.latestRiasec(studentId)]);
    const confirmed = records.filter((r) => r.isConfirmed).map((r) => r.toSnapshot());
    // Subject grades come from SPM (actual before targets), or school results before SPM.
    const graded =
      confirmed.find((r) => r.qualification === 'spm' && r.kind === 'actual') ??
      confirmed.find((r) => r.qualification === 'spm') ??
      confirmed.find((r) => r.qualification === 'school');
    // CGPA and MUET come from the newest result after SPM (STPM, matriculation, foundation, A-Level, diploma).
    const higher = confirmed.find((r) => (HigherQualifications as readonly string[]).includes(r.qualification));
    return {
      studentId,
      educationLevel: student.educationLevel ?? 'after_spm',
      isTargetBased: graded?.kind === 'target',
      gradeScale: graded?.qualification === 'school' ? 'school' : 'spm',
      // Subjects typed by the student are not in the catalogue, so no programme requirement can refer to them.
      grades: [
        ...(graded?.subjects ?? []).filter((s) => s.customName === null).map((s) => ({ subjectId: s.subjectId, grade: s.grade, scale: graded!.qualification as 'spm' | 'school' })),
        // STPM, A-Level, matriculation and foundation subject grades, for degree requirements on those subjects.
        ...(higher && hasSubjectGrades(higher.qualification) ? higher.subjects : [])
          .filter((s) => s.customName === null)
          .map((s) => ({ subjectId: s.subjectId, grade: s.grade, scale: higher!.qualification as 'stpm' | 'a_level' | 'matriculation' | 'foundation' })),
      ],
      higherQualification: student.higherQualification,
      cgpa: higher?.cgpa ?? null,
      muetBand: higher?.muetBand ?? null,
      riasec,
    };
  }
}
