/**
 * What an admin can do with a programme right now, worked out from its status, its pending change and who prepared
 * them. The programme page shows one message, a three-step progress line and the actions in this order (the first
 * is the main one). The catalogue service checks the same rules again.
 */
export type ProgrammeStatus = 'draft' | 'in_review' | 'returned' | 'published' | 'archived';
export type ChangeStatus = 'draft' | 'in_review' | 'returned';

export type WorkflowAction = 'edit' | 'submit' | 'withdraw' | 'approve' | 'return' | 'discard' | 'archive' | 'reopen' | 'delete';

export type WorkflowMessage =
  | 'draftMine'
  | 'draftOther'
  | 'returned'
  | 'reviewMine'
  | 'reviewOther'
  | 'reviewSuper'
  | 'published'
  | 'changeDraft'
  | 'changeReturned'
  | 'changeReviewMine'
  | 'changeReviewOther'
  | 'changeReviewSuper'
  | 'archived';

export interface Workflow {
  /** A new programme's steps (draft → review → published) or a published programme's change (change → review → live). */
  track: 'new' | 'change' | 'none';
  /** 0 = being prepared, 1 = with another admin, 2 = live. */
  step: 0 | 1 | 2;
  message: WorkflowMessage;
  actions: WorkflowAction[];
  /** Whether the reader may open the edit page now. */
  canEdit: boolean;
}

interface ProgrammeState {
  status: ProgrammeStatus;
  preparedBy: string | null;
  pendingStatus: ChangeStatus | null;
  pendingPreparedBy: string | null;
}

/** `superAdmin`: may approve their own work, so their own draft or change in review offers "approve" too. */
export function programmeWorkflow(p: ProgrammeState, me: string, superAdmin = false): Workflow {
  switch (p.status) {
    case 'draft':
      return { track: 'new', step: 0, message: !p.preparedBy || p.preparedBy === me ? 'draftMine' : 'draftOther', actions: ['submit', 'edit', 'delete'], canEdit: true };
    case 'returned':
      return { track: 'new', step: 0, message: 'returned', actions: ['edit', 'submit', 'delete'], canEdit: true };
    case 'in_review':
      if (superAdmin && p.preparedBy === me) return { track: 'new', step: 1, message: 'reviewSuper', actions: ['approve', 'withdraw'], canEdit: false };
      return p.preparedBy === me
        ? { track: 'new', step: 1, message: 'reviewMine', actions: ['withdraw'], canEdit: false }
        : { track: 'new', step: 1, message: 'reviewOther', actions: ['approve', 'return'], canEdit: false };
    case 'archived':
      return { track: 'none', step: 0, message: 'archived', actions: ['reopen', 'delete'], canEdit: false };
    case 'published':
      switch (p.pendingStatus) {
        case 'draft':
          return { track: 'change', step: 0, message: 'changeDraft', actions: ['submit', 'edit', 'discard'], canEdit: true };
        case 'returned':
          return { track: 'change', step: 0, message: 'changeReturned', actions: ['edit', 'submit', 'discard'], canEdit: true };
        case 'in_review':
          if (superAdmin && p.pendingPreparedBy === me) return { track: 'change', step: 1, message: 'changeReviewSuper', actions: ['approve', 'withdraw'], canEdit: false };
          return p.pendingPreparedBy === me
            ? { track: 'change', step: 1, message: 'changeReviewMine', actions: ['withdraw'], canEdit: false }
            : { track: 'change', step: 1, message: 'changeReviewOther', actions: ['approve', 'return'], canEdit: false };
        default:
          return { track: 'none', step: 2, message: 'published', actions: ['edit', 'archive'], canEdit: true };
      }
  }
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

/**
 * The fields a pending change alters, as text for a before / after table. `show` turns each field's value into words
 * (names instead of IDs, "Ya" for true); unchanged fields are left out.
 */
export function changedFields<T extends Record<string, unknown>>(live: T, proposed: T, show: Partial<Record<keyof T, (value: T[keyof T]) => string>>): FieldChange[] {
  const same = (a: unknown, b: unknown) => JSON.stringify(Array.isArray(a) ? [...a].sort() : a) === JSON.stringify(Array.isArray(b) ? [...b].sort() : b);
  return (Object.keys(show) as Array<keyof T>)
    .filter((key) => !same(live[key], proposed[key]))
    .map((key) => ({ field: String(key), before: show[key]!(live[key]), after: show[key]!(proposed[key]) }));
}
