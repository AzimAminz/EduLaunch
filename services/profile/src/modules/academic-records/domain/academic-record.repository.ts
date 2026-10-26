import type { Qualification } from '@edulaunch/contracts';
import type { AcademicRecord, RecordKind } from './academic-record.js';

export abstract class AcademicRecordRepository {
  abstract findById(id: string): Promise<AcademicRecord | null>;
  abstract findLatestConfirmed(studentId: string): Promise<AcademicRecord | null>;
  /** The student's record of this kind (for example their SPM target grades), draft or confirmed. */
  /** School grades are kept per year (Form 1, 2, 3…), so `examYear` picks which one; SPM records ignore it. */
  abstract findCurrent(studentId: string, qualification: Qualification, kind: RecordKind, examYear?: number | null): Promise<AcademicRecord | null>;
  /** Every record of the student, newest exam year first: their academic history across levels. */
  abstract listByStudent(studentId: string): Promise<AcademicRecord[]>;
  abstract save(record: AcademicRecord): Promise<void>;
}
