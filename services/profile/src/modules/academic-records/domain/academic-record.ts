import { AggregateRoot, DomainError, createEvent } from '@edulaunch/ddd';
import { Events, MuetBands, hasCgpa, hasSubjectGrades, isValidGrade, type RecordQualification } from '@edulaunch/contracts';

export type RecordKind = 'actual' | 'target' | 'school';

export interface SubjectGrade {
  subjectId: string;
  grade: string;
  /** Name typed by the student for a subject that is not in the catalogue; null for catalogue subjects. */
  customName: string | null;
  readConfidence: number | null;
}

export const MAX_CUSTOM_NAME = 80;

export interface ResultDetails {
  cgpa: number | null;
  muetBand: number | null;
  /** Diploma only. */
  fieldId: string | null;
  programmeName: string | null;
}

interface AcademicRecordProps {
  studentId: string;
  qualification: RecordQualification;
  kind: RecordKind;
  examYear: number | null;
  cgpa: number | null;
  muetBand: number | null;
  fieldId: string | null;
  programmeName: string | null;
  subjects: SubjectGrade[];
  status: 'draft' | 'confirmed';
  confirmedAt: Date | null;
}

/**
 * A set of results (actual, target or school grades). Students add or remove subjects
 * because not everyone takes the same ones. Nothing is used for eligibility until confirmed.
 */
export class AcademicRecord extends AggregateRoot<string, AcademicRecordProps> {
  static start(id: string, input: { studentId: string; qualification: RecordQualification; kind: RecordKind; examYear: number | null }): AcademicRecord {
    if ((input.kind === 'school') !== (input.qualification === 'school')) {
      throw new DomainError('invalid_record', 'School grades use the school grade scale, and only school records use it');
    }
    if (input.kind === 'target' && input.qualification !== 'spm') throw new DomainError('invalid_record', 'Only SPM has target grades');
    return new AcademicRecord(id, { ...input, cgpa: null, muetBand: null, fieldId: null, programmeName: null, subjects: [], status: 'draft', confirmedAt: null });
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
      this.props.subjects.push({ subjectId, grade: normalised, customName: null, readConfidence });
    }
    this.reopen();
  }

  /** Replaces the whole subject list at once (the results form saves every row together). */
  replaceSubjects(subjects: ReadonlyArray<{ subjectId: string; grade: string; customName?: string | null }>): void {
    const seen = new Set<string>();
    const names = new Set<string>();
    const next: SubjectGrade[] = [];
    for (const { subjectId, grade, customName } of subjects) {
      if (seen.has(subjectId)) throw new DomainError('duplicate_subject', 'Each subject can only be listed once');
      seen.add(subjectId);
      const name = customName?.trim().replace(/\s+/g, ' ') || null;
      if (name !== null) {
        if (name.length > MAX_CUSTOM_NAME) throw new DomainError('invalid_subject', `A subject name can have at most ${MAX_CUSTOM_NAME} characters`);
        if (names.has(name.toLocaleLowerCase())) throw new DomainError('duplicate_subject', 'Each subject can only be listed once');
        names.add(name.toLocaleLowerCase());
      }
      next.push({ subjectId, grade: this.validGrade(grade), customName: name, readConfidence: null });
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

  /** CGPA, MUET and (for a diploma) its field and programme name. Values that do not apply to this qualification are refused. */
  setResultDetails(details: ResultDetails): void {
    const q = this.props.qualification;
    const { cgpa, muetBand, fieldId } = details;
    const programmeName = details.programmeName?.trim() || null;
    if (cgpa !== null && !hasCgpa(q)) throw new DomainError('invalid_record', `${q.toUpperCase()} results have no CGPA`);
    if (cgpa !== null && (cgpa < 0 || cgpa > 4 || Math.round(cgpa * 100) !== cgpa * 100)) throw new DomainError('invalid_record', 'CGPA is a number from 0.00 to 4.00');
    if (muetBand !== null && (q === 'school' || q === 'spm')) throw new DomainError('invalid_record', 'MUET is recorded with results after SPM');
    if (muetBand !== null && !(MuetBands as readonly number[]).includes(muetBand)) throw new DomainError('invalid_record', 'Choose a MUET band from 1.0 to 5+');
    if ((fieldId !== null || programmeName !== null) && q !== 'diploma') throw new DomainError('invalid_record', 'Only a diploma has a field and programme name');
    if (programmeName !== null && programmeName.length > 120) throw new DomainError('invalid_record', 'A programme name can have at most 120 characters');
    const changed = cgpa !== this.props.cgpa || muetBand !== this.props.muetBand || fieldId !== this.props.fieldId || programmeName !== this.props.programmeName;
    Object.assign(this.props, { cgpa, muetBand, fieldId, programmeName });
    if (changed) this.reopen();
  }

  removeSubject(subjectId: string): void {
    const before = this.props.subjects.length;
    this.props.subjects = this.props.subjects.filter((s) => s.subjectId !== subjectId);
    if (this.props.subjects.length === before) throw new DomainError('not_found', 'That subject is not in this record');
    this.reopen();
  }

  /** Subject-graded results need subjects; STPM, matriculation, foundation and diploma need their CGPA. */
  confirm(): void {
    const q = this.props.qualification;
    if (hasSubjectGrades(q) && this.props.subjects.length === 0) throw new DomainError('invalid_record', 'Add at least one subject before confirming');
    if (hasCgpa(q) && this.props.cgpa === null) throw new DomainError('invalid_record', 'Enter the CGPA before confirming');
    this.props.status = 'confirmed';
    this.props.confirmedAt = new Date();
    this.record(createEvent(Events.AcademicRecordConfirmed, { studentId: this.props.studentId, recordId: this.id }));
  }

  private validGrade(grade: string): string {
    const q = this.props.qualification;
    if (!hasSubjectGrades(q)) throw new DomainError('invalid_grade', `${q} results are recorded without subject grades`);
    const normalised = grade.trim().toUpperCase();
    if (!isValidGrade(q, normalised)) {
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
