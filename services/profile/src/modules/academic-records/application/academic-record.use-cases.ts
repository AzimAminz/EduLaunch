import { Inject, Injectable } from '@nestjs/common';
import { DomainError, NotFoundError } from '@edulaunch/ddd';
import { EventBus, type Caller } from '@edulaunch/nest-kit';
import type { RecordQualification } from '@edulaunch/contracts';
import { randomUUID } from 'node:crypto';
import { AcademicRecord, type RecordKind, type ResultDetails } from '../domain/academic-record.js';
import { AcademicRecordRepository } from '../domain/academic-record.repository.js';
import { GetOrCreateMe } from '../../students/application/student.use-cases.js';

export type RecordChange =
  | { type: 'set_grade'; subjectId: string; grade: string }
  | { type: 'remove_subject'; subjectId: string }
  | { type: 'confirm' };

export interface RecordKey {
  qualification: RecordQualification;
  kind: RecordKind;
  /** Needed for school grades, which are kept per year. */
  examYear?: number | null;
}

export interface SaveRecordInput extends Partial<ResultDetails> {
  qualification: RecordQualification;
  kind: RecordKind;
  examYear: number | null;
  subjects: Array<{ subjectId: string; grade: string; customName?: string | null }>;
}

/** All edits go through the aggregate; the caller can only touch their own records. */
@Injectable()
export class AcademicRecordService {
  constructor(
    private readonly records: AcademicRecordRepository,
    private readonly me: GetOrCreateMe,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  async start(caller: Caller, input: { qualification: RecordQualification; kind: RecordKind; examYear: number | null }) {
    const { studentId } = await this.me.execute(caller);
    const record = AcademicRecord.start(randomUUID(), { studentId, ...input });
    await this.records.save(record);
    return record.toSnapshot();
  }

  /** The caller's record of this kind, or null when they have not saved one yet. */
  async current(caller: Caller, input: RecordKey) {
    const { studentId } = await this.me.execute(caller);
    const record = await this.records.findCurrent(studentId, input.qualification, input.kind, input.examYear ?? null);
    return record ? record.toSnapshot() : null;
  }

  /** All the caller's records (school years, SPM targets, actual SPM), newest first. */
  async list(caller: Caller) {
    const { studentId } = await this.me.execute(caller);
    return (await this.records.listByStudent(studentId)).map((r) => r.toSnapshot());
  }

  async get(caller: Caller, recordId: string) {
    return (await this.ownedRecord(caller, recordId)).toSnapshot();
  }

  /** Saves the whole results form: creates the record the first time, replaces every row, and confirms it. */
  async saveCurrent(caller: Caller, input: SaveRecordInput) {
    if ((input.kind === 'school' || input.kind === 'target') && input.examYear === null) throw new DomainError('invalid_record', 'Choose the year (form) of these results');
    const { studentId } = await this.me.execute(caller);
    const record =
      (await this.records.findCurrent(studentId, input.qualification, input.kind, input.examYear)) ??
      AcademicRecord.start(randomUUID(), { studentId, qualification: input.qualification, kind: input.kind, examYear: null });
    record.setExamYear(input.examYear);
    record.replaceSubjects(input.subjects);
    record.setResultDetails({
      cgpa: input.cgpa ?? null,
      muetBand: input.muetBand ?? null,
      fieldId: input.fieldId ?? null,
      programmeName: input.programmeName ?? null,
      qualificationLevel: input.qualificationLevel ?? null,
      stream: input.stream ?? null,
    });
    record.confirm();
    await this.records.save(record);
    await this.events.publish(record.pullEvents());
    return record.toSnapshot();
  }

  async change(caller: Caller, recordId: string, change: RecordChange) {
    const record = await this.ownedRecord(caller, recordId);
    if (change.type === 'set_grade') record.setGrade(change.subjectId, change.grade);
    else if (change.type === 'remove_subject') record.removeSubject(change.subjectId);
    else record.confirm();
    await this.records.save(record);
    await this.events.publish(record.pullEvents());
    return record.toSnapshot();
  }

  private async ownedRecord(caller: Caller, recordId: string): Promise<AcademicRecord> {
    const [{ studentId }, record] = await Promise.all([this.me.execute(caller), this.records.findById(recordId)]);
    if (!record) throw new NotFoundError('Academic record', recordId);
    if (record.toSnapshot().studentId !== studentId) throw new DomainError('forbidden', 'This record belongs to someone else');
    return record;
  }
}
