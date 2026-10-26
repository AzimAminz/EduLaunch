import { AggregateRoot, DomainError } from '@edulaunch/ddd';
import { InstitutionTypes, MalaysianStates, type InstitutionType } from '@edulaunch/contracts';

export interface InstitutionDetails {
  name: string;
  shortName: string | null;
  type: string;
  websiteUrl: string | null;
  state?: string | null;
}

interface InstitutionProps {
  name: string;
  shortName: string | null;
  type: InstitutionType;
  websiteUrl: string | null;
  state: string | null;
  /** Set while a delete waits for a second admin. */
  deletionRequestedBy: string | null;
  deletionRequestedAt: Date | null;
}

export type DeletionOutcome = 'delete_now' | 'requested';

/**
 * A university, polytechnic or college that offers programmes. Reference data: admins add and edit it directly.
 * Deleting removes everything under it, so the admin types its name to confirm; when students can see some of its
 * programmes, another admin must approve the delete as well.
 */
export class Institution extends AggregateRoot<string, InstitutionProps> {
  static create(id: string, details: InstitutionDetails): Institution {
    return new Institution(id, { ...Institution.validated(details), deletionRequestedBy: null, deletionRequestedAt: null });
  }

  static restore(id: string, props: InstitutionProps): Institution {
    return new Institution(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  /** What the admin types to confirm a delete: the short name when there is one, otherwise the full name. */
  get confirmationText(): string {
    return this.props.shortName ?? this.props.name;
  }

  update(details: InstitutionDetails): void {
    this.props = { ...this.props, ...Institution.validated({ ...details, state: details.state === undefined ? this.props.state : details.state }) };
  }

  /**
   * First step of a delete. Without published programmes it can happen at once; otherwise it waits for another
   * admin (students would lose programmes they can see).
   */
  requestDeletion(by: string, typed: string, hasPublishedProgrammes: boolean, now = new Date()): DeletionOutcome {
    if (typed.trim().toLocaleLowerCase() !== this.confirmationText.toLocaleLowerCase()) {
      throw new DomainError('confirmation_mismatch', `Type ${this.confirmationText} to confirm`);
    }
    if (!hasPublishedProgrammes) return 'delete_now';
    if (this.props.deletionRequestedBy) throw new DomainError('conflict', 'A delete is already waiting for approval');
    this.props.deletionRequestedBy = by;
    this.props.deletionRequestedAt = now;
    return 'requested';
  }

  /** Another admin agrees to a waiting delete. */
  approveDeletion(by: string): void {
    if (!this.props.deletionRequestedBy) throw new DomainError('conflict', 'No delete is waiting for approval');
    if (by === this.props.deletionRequestedBy) throw new DomainError('forbidden', 'Another admin must approve this delete');
  }

  cancelDeletion(): void {
    if (!this.props.deletionRequestedBy) throw new DomainError('conflict', 'No delete is waiting for approval');
    this.props.deletionRequestedBy = null;
    this.props.deletionRequestedAt = null;
  }

  private static validated(d: InstitutionDetails): Omit<InstitutionProps, 'deletionRequestedBy' | 'deletionRequestedAt'> {
    const name = d.name.trim();
    if (name.length < 3 || name.length > 160) throw new DomainError('invalid_institution', 'Name must be 3 to 160 characters');
    const shortName = d.shortName?.trim() || null;
    if (shortName && shortName.length > 20) throw new DomainError('invalid_institution', 'Short name must be at most 20 characters');
    if (!(InstitutionTypes as readonly string[]).includes(d.type)) throw new DomainError('invalid_institution', `Unknown institution type ${d.type}`);
    const websiteUrl = d.websiteUrl?.trim() || null;
    if (websiteUrl && (!/^https?:\/\/\S+$/.test(websiteUrl) || websiteUrl.length > 300)) {
      throw new DomainError('invalid_source', 'The website must be a web link (https://…)');
    }
    const state = d.state?.trim() || null;
    if (state && !(MalaysianStates as readonly string[]).includes(state)) throw new DomainError('invalid_institution', `Unknown state ${state}`);
    return { name, shortName, type: d.type as InstitutionType, websiteUrl, state };
  }
}
