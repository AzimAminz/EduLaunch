import { AggregateRoot, DomainError } from '@edulaunch/ddd';
import { StudyModes, UPU_CODE_PATTERN, type StudyLevel, type StudyMode } from '@edulaunch/contracts';

export type PublishStatus = 'draft' | 'in_review' | 'returned' | 'published' | 'archived';

/** The details JPT and university prospectuses publish for every programme, so all programmes share one standard. */
export interface ProgramFacts {
  /** JPT / UPU code, for example UC6522001. */
  upuCode: string | null;
  /** The university's own code, for example BELG. */
  internalCode: string | null;
  faculty: string | null;
  /** National Education Code field, for example 0712. */
  necCode: string | null;
  studyMode: StudyMode | null;
  campus: string | null;
  hasInterview: boolean;
  isStem: boolean;
  isTvet: boolean;
  bumiputeraOnly: boolean;
  /** The official page or document these details come from. */
  sourceUrl: string | null;
}

interface ProgramCore {
  institutionId: string | null;
  name: string;
  studyLevel: StudyLevel;
  durationSemesters: number | null;
  fieldIds: string[];
}

/** What an admin or an import supplies; facts left out stay as they were (or empty for a new programme). */
export type ProgramDetails = ProgramCore & Partial<ProgramFacts>;

/** Only the values actually given, so a missing fact never overwrites a saved one with `undefined`. */
const given = <T extends object>(details: T): T => Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined)) as T;

/** Facts of a programme nobody has filled in yet. */
export const NO_FACTS: ProgramFacts = {
  upuCode: null,
  internalCode: null,
  faculty: null,
  necCode: null,
  studyMode: null,
  campus: null,
  hasInterview: false,
  isStem: false,
  isTvet: false,
  bumiputeraOnly: false,
  sourceUrl: null,
};

export type PendingStatus = 'draft' | 'in_review' | 'returned';

/**
 * Changes to a published programme, kept beside it until another admin approves them. Students keep seeing the
 * published details meanwhile (like a "changed" entry in a headless CMS). Holds the whole proposed version.
 */
export interface PendingChange {
  details: ProgramCore & ProgramFacts;
  status: PendingStatus;
  preparedBy: string;
  returnReason: string | null;
}

type ProgramProps = ProgramCore &
  ProgramFacts & {
    publishStatus: PublishStatus;
    /** The admin who last changed or sent the draft (the maker); null for programmes loaded from the seed. */
    preparedBy: string | null;
    approvedBy: string | null;
    returnReason: string | null;
    pending: PendingChange | null;
  };

/**
 * A study option students can find. Maker-checker ("four eyes"): any admin may prepare a change, and an admin other
 * than the one who prepared it approves it.
 * - A new programme is a draft students cannot see: draft → in_review → published (or returned → draft).
 * - A published programme is changed through a pending change: students keep the published details until another
 *   admin approves the change.
 * - A published programme can be archived (hidden) and reopened as a draft.
 */
export class Program extends AggregateRoot<string, ProgramProps> {
  static create(id: string, details: ProgramDetails, preparedBy: string | null = null): Program {
    return new Program(id, {
      ...Program.validated({ ...NO_FACTS, ...given(details) }),
      publishStatus: 'draft',
      preparedBy,
      approvedBy: null,
      returnReason: null,
      pending: null,
    });
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

  get pending(): PendingChange | null {
    return this.props.pending;
  }

  get isStream(): boolean {
    return this.props.studyLevel === 'form4_stream';
  }

  get isVisibleToStudents(): boolean {
    return this.props.publishStatus === 'published';
  }

  /**
   * Any admin may change a programme; whoever changes it becomes its preparer (and so cannot approve it).
   * Before the first publication the institution and level can change too; afterwards they stay as published.
   */
  edit(by: string, details: Partial<ProgramDetails>): void {
    const status = this.props.publishStatus;
    if (status === 'archived') throw new DomainError('conflict', 'Reopen this archived programme before editing it');
    if (status === 'in_review') throw new DomainError('conflict', 'This programme is waiting for review; withdraw it first to edit');
    if (status === 'published') {
      if (this.props.pending?.status === 'in_review') throw new DomainError('conflict', 'The changes are waiting for review; withdraw them first to edit');
      const base = this.props.pending?.details ?? this.liveDetails();
      const next = Program.validated({ ...base, ...given(details), institutionId: this.props.institutionId, studyLevel: this.props.studyLevel });
      this.props.pending = { details: next, status: 'draft', preparedBy: by, returnReason: this.props.pending?.returnReason ?? null };
      return;
    }
    this.props = { ...this.props, ...Program.validated({ ...this.liveDetails(), ...given(details) }), preparedBy: by };
  }

  /** Sends the draft, or the pending change of a published programme, to another admin. */
  submitForReview(by: string): void {
    if (this.isDraft) {
      this.props = { ...this.props, publishStatus: 'in_review', preparedBy: by, returnReason: null };
      return;
    }
    const pending = this.props.pending;
    if (this.props.publishStatus === 'published' && pending && pending.status !== 'in_review') {
      this.props.pending = { ...pending, status: 'in_review', preparedBy: by, returnReason: null };
      return;
    }
    throw new DomainError('conflict', 'There is nothing to send for review');
  }

  /** Takes a draft (or pending change) back from review so it can be edited again. */
  withdraw(): void {
    if (this.props.publishStatus === 'in_review') {
      this.props.publishStatus = 'draft';
      return;
    }
    if (this.props.pending?.status === 'in_review') {
      this.props.pending = { ...this.props.pending, status: 'draft' };
      return;
    }
    throw new DomainError('conflict', 'Nothing is waiting for review');
  }

  approve(by: string): void {
    const target = this.reviewTarget(by);
    if (target === 'draft') {
      this.props = { ...this.props, publishStatus: 'published', approvedBy: by };
      return;
    }
    // The approved change becomes what students see.
    this.props = { ...this.props, ...this.props.pending!.details, approvedBy: by, pending: null };
  }

  returnToPreparer(by: string, reason: string): void {
    const target = this.reviewTarget(by);
    if (reason.trim().length < 5) throw new DomainError('reason_required', 'Explain what needs to change');
    if (target === 'draft') this.props = { ...this.props, publishStatus: 'returned', returnReason: reason.trim() };
    else this.props.pending = { ...this.props.pending!, status: 'returned', returnReason: reason.trim() };
  }

  /** Drops the pending change of a published programme; the published details stay. */
  discardChanges(): void {
    if (!this.props.pending) throw new DomainError('conflict', 'There are no changes to discard');
    if (this.props.pending.status === 'in_review') throw new DomainError('conflict', 'Withdraw the changes from review first');
    this.props.pending = null;
  }

  /** Hides a published programme from students (for example, no longer offered). */
  archive(): void {
    if (this.props.publishStatus !== 'published') throw new DomainError('conflict', 'Only a published programme can be archived');
    if (this.props.pending?.status === 'in_review') throw new DomainError('conflict', 'Its changes are waiting for review; withdraw them first');
    this.props = { ...this.props, publishStatus: 'archived', pending: null };
  }

  /**
   * Checks the programme may be deleted (the repository removes it with its requirements). Students must never lose
   * a programme they can see: a published one is archived first, and one in review is withdrawn first.
   */
  assertDeletable(): void {
    if (this.props.publishStatus === 'published') throw new DomainError('conflict', 'Archive this programme before deleting it');
    if (this.props.publishStatus === 'in_review') throw new DomainError('conflict', 'Withdraw this programme from review before deleting it');
  }

  /** Brings an archived programme back as a draft, to be reviewed again before students see it. */
  reopen(by: string): void {
    if (this.props.publishStatus !== 'archived') throw new DomainError('conflict', 'Only an archived programme can be reopened');
    this.props = { ...this.props, publishStatus: 'draft', preparedBy: by, approvedBy: null, returnReason: null };
  }

  private liveDetails(): ProgramCore & ProgramFacts {
    const { publishStatus: _s, preparedBy: _p, approvedBy: _a, returnReason: _r, pending: _c, ...details } = this.props;
    return details;
  }

  private get isDraft(): boolean {
    return this.props.publishStatus === 'draft' || this.props.publishStatus === 'returned';
  }

  /** What an approve or return acts on, after checking that someone other than its preparer is reviewing it. */
  private reviewTarget(by: string): 'draft' | 'change' {
    if (this.props.publishStatus === 'in_review') {
      if (by === this.props.preparedBy) throw new DomainError('forbidden', 'Another admin must review this programme');
      return 'draft';
    }
    if (this.props.pending?.status === 'in_review') {
      if (by === this.props.pending.preparedBy) throw new DomainError('forbidden', 'Another admin must review these changes');
      return 'change';
    }
    throw new DomainError('conflict', 'This programme is not waiting for review');
  }

  private static validated(d: ProgramCore & ProgramFacts): ProgramCore & ProgramFacts {
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
    const text = (v: string | null | undefined, max: number, what: string) => {
      const t = v?.trim() || null;
      if (t && t.length > max) throw new DomainError('invalid_program', `${what} must be at most ${max} characters`);
      return t;
    };
    const upuCode = text(d.upuCode, 9, 'Programme code')?.toUpperCase() ?? null;
    if (upuCode && !UPU_CODE_PATTERN.test(upuCode)) throw new DomainError('invalid_program', 'Programme code must look like UC6522001');
    if (d.necCode && !/^\d{4}$/.test(d.necCode)) throw new DomainError('invalid_program', 'NEC code has four digits');
    if (d.studyMode && !(StudyModes as readonly string[]).includes(d.studyMode)) throw new DomainError('invalid_program', `Unknown study mode ${d.studyMode}`);
    const sourceUrl = text(d.sourceUrl, 500, 'Source link');
    if (sourceUrl && !/^https?:\/\/\S+$/.test(sourceUrl)) throw new DomainError('invalid_source', 'The source must be a web link (https://…)');
    return {
      ...d,
      name,
      fieldIds: [...new Set(d.fieldIds)],
      upuCode,
      internalCode: text(d.internalCode, 20, 'University code'),
      faculty: text(d.faculty, 160, 'Faculty'),
      campus: text(d.campus, 120, 'Campus'),
      sourceUrl,
    };
  }
}
