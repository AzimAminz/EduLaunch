import type { RecordQualification } from '@edulaunch/contracts';
import type { AcademicRecord, RecordKind } from './academic-record.js';

export abstract class AcademicRecordRepository {
  abstract findById(id: string): Promise<AcademicRecord | null>;
  abstract findLatestConfirmed(studentId: string): Promise<AcademicRecord | null>;
  /** The student's record of this kind (for example their SPM target grades), draft or confirmed. */
  /** School grades and Form 4–5 grades are kept per year (one per form), so `examYear` picks which one; actual SPM ignores it. */
  abstract findCurrent(studentId: string, qualification: RecordQualification, kind: RecordKind, examYear?: number | null): Promise<AcademicRecord | null>;
  /** Every record of the student, newest exam year first: their academic history across levels. */
  abstract listByStudent(studentId: string): Promise<AcademicRecord[]>;
  /** Removes records (and their subjects) that no longer fit the student's level; see retention.ts. */
  abstract deleteMany(ids: string[]): Promise<void>;
  abstract save(record: AcademicRecord): Promise<void>;
}
