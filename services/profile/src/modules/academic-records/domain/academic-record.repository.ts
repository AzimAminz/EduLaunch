import type { AcademicRecord } from './academic-record.js';

export abstract class AcademicRecordRepository {
  abstract findById(id: string): Promise<AcademicRecord | null>;
  abstract findLatestConfirmed(studentId: string): Promise<AcademicRecord | null>;
  abstract save(record: AcademicRecord): Promise<void>;
}
