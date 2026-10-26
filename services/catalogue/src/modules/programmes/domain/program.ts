import { AggregateRoot, DomainError } from '@edulaunch/ddd';
import type { StudyLevel } from '@edulaunch/contracts';

export type PublishStatus = 'draft' | 'in_review' | 'returned' | 'published' | 'archived';

export interface ProgramDetails {
  institutionId: string | null;
  name: string;
  studyLevel: StudyLevel;
  durationSemesters: number | null;
  fieldIds: string[];
}

interface ProgramProps extends ProgramDetails {
  publishStatus: PublishStatus;
  /** The admin who prepared the draft; null for programmes loaded from the seed. */
  preparedBy: string | null;
  approvedBy: string | null;
  returnReason: string | null;
}

/**
 * A study option students can find. New programmes start as drafts that students cannot see.
 * Workflow: draft → in_review → published (or returned → draft); another admin must approve.
 * A published programme's details can still be corrected; it can be archived to hide it again.
 */
export class Program extends AggregateRoot<string, ProgramProps> {
  static create(id: string, details: ProgramDetails, preparedBy: string | null = null): Program {
    const program = new Program(id, { ...details, publishStatus: 'draft', preparedBy, approvedBy: null, returnReason: null });
    program.props = { ...program.props, ...Program.validated(details) };
    return program;
  }

  static restore(id: string, props: ProgramProps): Program {
    return new Program(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get studyLevel(): StudyLevel {
    return this.props.studyLevel;
  }

  get status(): PublishStatus {
    return this.props.publishStatus;
  }

  get isStream(): boolean {
    return this.props.studyLevel === 'form4_stream';
  }

  get isVisibleToStudents(): boolean {
    return this.props.publishStatus === 'published';
  }

  /** Changes name, duration and fields. Drafts only by the admin preparing them; published ones by any admin. */
  updateDetails(by: string, details: Omit<ProgramDetails, 'institutionId' | 'studyLevel'>): void {
    if (this.props.publishStatus === 'archived') throw new DomainError('conflict', 'An archived programme cannot be edited');
    if (this.props.publishStatus === 'in_review') throw new DomainError('conflict', 'This programme is waiting for review; ask the reviewer to return it first');
    if (this.isDraft && this.props.preparedBy && this.props.preparedBy !== by) {
      throw new DomainError('forbidden', 'Only the admin who prepared this draft can edit it');
    }
    const next = Program.validated({ ...this.props, ...details });
    this.props = { ...this.props, name: next.name, durationSemesters: next.durationSemesters, fieldIds: next.fieldIds };
  }

  submitForReview(by: string): void {
    if (!this.isDraft) throw new DomainError('conflict', 'Only a draft can be sent for review');
    if (this.props.preparedBy && this.props.preparedBy !== by) throw new DomainError('forbidden', 'Only the admin who prepared the draft can submit it');
    this.props.preparedBy = by;
    this.props.publishStatus = 'in_review';
    this.props.returnReason = null;
  }

  approve(by: string): void {
    this.assertInReview(by);
    this.props.publishStatus = 'published';
    this.props.approvedBy = by;
  }

  returnToPreparer(by: string, reason: string): void {
    this.assertInReview(by);
    if (reason.trim().length < 5) throw new DomainError('reason_required', 'Explain what needs to change');
    this.props.publishStatus = 'returned';
    this.props.returnReason = reason.trim();
  }

  /** Hides a published programme from students (for example, no longer offered). */
  archive(): void {
    if (this.props.publishStatus !== 'published') throw new DomainError('conflict', 'Only a published programme can be archived');
    this.props.publishStatus = 'archived';
  }

  /** Brings an archived programme back as a draft, to be reviewed again before students see it. */
  reopen(by: string): void {
    if (this.props.publishStatus !== 'archived') throw new DomainError('conflict', 'Only an archived programme can be reopened');
    this.props = { ...this.props, publishStatus: 'draft', preparedBy: by, approvedBy: null, returnReason: null };
  }

  private get isDraft(): boolean {
    return this.props.publishStatus === 'draft' || this.props.publishStatus === 'returned';
  }

  private assertInReview(by: string): void {
    if (this.props.publishStatus !== 'in_review') throw new DomainError('conflict', 'This programme is not waiting for review');
    if (by === this.props.preparedBy) throw new DomainError('forbidden', 'Another admin must review this programme');
  }

  private static validated(d: ProgramDetails): ProgramDetails {
    if (d.studyLevel === 'form4_stream' && d.institutionId !== null) {
      throw new DomainError('invalid_program', 'A Form 4 stream does not belong to an institution');
    }
    if (d.studyLevel !== 'form4_stream' && d.institutionId === null) {
      throw new DomainError('invalid_program', 'A programme must belong to an institution');
    }
    const name = d.name.trim();
    if (name.length < 3 || name.length > 160) throw new DomainError('invalid_program', 'Programme name must be 3 to 160 characters');
    if (d.durationSemesters !== null && (!Number.isInteger(d.durationSemesters) || d.durationSemesters < 1 || d.durationSemesters > 16)) {
      throw new DomainError('invalid_program', 'Duration must be 1 to 16 semesters');
    }
    return { ...d, name, fieldIds: [...new Set(d.fieldIds)] };
  }
}
