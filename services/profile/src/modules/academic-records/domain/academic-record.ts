import { AggregateRoot, DomainError, createEvent } from '@edulaunch/ddd';
import { Events, isValidGrade, type Qualification } from '@edulaunch/contracts';

export type RecordKind = 'actual' | 'target' | 'school';

export interface SubjectGrade {
  subjectId: string;
  grade: string;
  readConfidence: number | null;
}

interface AcademicRecordProps {
  studentId: string;
  qualification: Qualification;
  kind: RecordKind;
  examYear: number | null;
  cgpa: number | null;
  muetBand: number | null;
  subjects: SubjectGrade[];
  status: 'draft' | 'confirmed';
  confirmedAt: Date | null;
}

/**
 * A set of results (actual, target or school grades). Students add or remove subjects
 * because not everyone takes the same ones. Nothing is used for eligibility until confirmed.
 */
export class AcademicRecord extends AggregateRoot<string, AcademicRecordProps> {
  static start(id: string, input: { studentId: string; qualification: Qualification; kind: RecordKind; examYear: number | null }): AcademicRecord {
    if ((input.kind === 'school') !== (input.qualification === 'school')) {
      throw new DomainError('invalid_record', 'School grades use the school grade scale, and only school records use it');
    }
    return new AcademicRecord(id, { ...input, cgpa: null, muetBand: null, subjects: [], status: 'draft', confirmedAt: null });
  }

  static restore(id: string, props: AcademicRecordProps): AcademicRecord {
    return new AcademicRecord(id, props);
  }

  get subjects(): readonly SubjectGrade[] {
    return this.props.subjects;
  }

  get isConfirmed(): boolean {
    return this.props.status === 'confirmed';
  }

  setGrade(subjectId: string, grade: string, readConfidence: number | null = null): void {
    const normalised = this.validGrade(grade);
    const existing = this.props.subjects.find((s) => s.subjectId === subjectId);
    if (existing) {
      existing.grade = normalised;
      existing.readConfidence = readConfidence;
    } else {
      this.props.subjects.push({ subjectId, grade: normalised, readConfidence });
    }
    this.reopen();
  }

  /** Replaces the whole subject list at once (the results form saves every row together). */
  replaceSubjects(subjects: ReadonlyArray<{ subjectId: string; grade: string }>): void {
    const seen = new Set<string>();
    const next: SubjectGrade[] = [];
    for (const { subjectId, grade } of subjects) {
      if (seen.has(subjectId)) throw new DomainError('duplicate_subject', 'Each subject can only be listed once');
      seen.add(subjectId);
      next.push({ subjectId, grade: this.validGrade(grade), readConfidence: null });
    }
    this.props.subjects = next;
    this.reopen();
  }

  setExamYear(examYear: number | null): void {
    if (examYear !== null && (!Number.isInteger(examYear) || examYear < 2000 || examYear > 2100)) {
      throw new DomainError('invalid_record', 'Choose an exam year between 2000 and 2100');
    }
    if (examYear === this.props.examYear) return;
    this.props.examYear = examYear;
    this.reopen();
  }

  removeSubject(subjectId: string): void {
    const before = this.props.subjects.length;
    this.props.subjects = this.props.subjects.filter((s) => s.subjectId !== subjectId);
    if (this.props.subjects.length === before) throw new DomainError('not_found', 'That subject is not in this record');
    this.reopen();
  }

  confirm(): void {
    if (this.props.subjects.length === 0) throw new DomainError('invalid_record', 'Add at least one subject before confirming');
    this.props.status = 'confirmed';
    this.props.confirmedAt = new Date();
    this.record(createEvent(Events.AcademicRecordConfirmed, { studentId: this.props.studentId, recordId: this.id }));
  }

  private validGrade(grade: string): string {
    const normalised = grade.trim().toUpperCase();
    if (!isValidGrade(this.props.qualification, normalised)) {
      throw new DomainError('invalid_grade', `"${grade}" is not a ${this.props.qualification.toUpperCase()} grade`);
    }
    return normalised;
  }

  /** Any change after confirming needs the student to confirm again. */
  private reopen(): void {
    this.props.status = 'draft';
    this.props.confirmedAt = null;
  }
}
