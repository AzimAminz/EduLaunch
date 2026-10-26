import type { Qualification } from '@edulaunch/contracts';
import type { AcademicRecord, RecordKind } from './academic-record.js';

export abstract class AcademicRecordRepository {
  abstract findById(id: string): Promise<AcademicRecord | null>;
  abstract findLatestConfirmed(studentId: string): Promise<AcademicRecord | null>;
  /** The student's record of this kind (for example their SPM target grades), draft or confirmed. */
  abstract findCurrent(studentId: string, qualification: Qualification, kind: RecordKind): Promise<AcademicRecord | null>;
  abstract save(record: AcademicRecord): Promise<void>;
}
