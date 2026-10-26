import { describe, expect, it } from 'vitest';
import { changedFields, programmeWorkflow } from './programme-workflow';

const me = 'admin-a';
const other = 'admin-b';
const state = (over: Partial<Parameters<typeof programmeWorkflow>[0]> = {}) => ({ status: 'draft' as const, preparedBy: me, pendingStatus: null, pendingPreparedBy: null, ...over });

describe('programmeWorkflow', () => {
  it('lets anyone send or edit a draft, mentioning when someone else prepared it', () => {
    expect(programmeWorkflow(state(), me)).toEqual({ track: 'new', step: 0, message: 'draftMine', actions: ['submit', 'edit'], canEdit: true });
    expect(programmeWorkflow(state({ preparedBy: other }), me).message).toBe('draftOther');
    expect(programmeWorkflow(state({ preparedBy: null }), me).message).toBe('draftMine');
  });

  it('puts editing first when a draft came back', () => {
    expect(programmeWorkflow(state({ status: 'returned' }), me).actions).toEqual(['edit', 'submit']);
  });

  it('lets the preparer withdraw a draft in review, and another admin approve or return it', () => {
    expect(programmeWorkflow(state({ status: 'in_review' }), me)).toMatchObject({ step: 1, message: 'reviewMine', actions: ['withdraw'], canEdit: false });
    expect(programmeWorkflow(state({ status: 'in_review', preparedBy: other }), me)).toMatchObject({ message: 'reviewOther', actions: ['approve', 'return'] });
  });

  it('edits a published programme through a change that follows the same steps', () => {
    const live = state({ status: 'published', preparedBy: null });
    expect(programmeWorkflow(live, me)).toEqual({ track: 'none', step: 2, message: 'published', actions: ['edit', 'archive'], canEdit: true });
    expect(programmeWorkflow({ ...live, pendingStatus: 'draft', pendingPreparedBy: me }, me)).toMatchObject({ track: 'change', step: 0, actions: ['submit', 'edit', 'discard'] });
    expect(programmeWorkflow({ ...live, pendingStatus: 'returned', pendingPreparedBy: me }, me).message).toBe('changeReturned');
    expect(programmeWorkflow({ ...live, pendingStatus: 'in_review', pendingPreparedBy: me }, me).actions).toEqual(['withdraw']);
    expect(programmeWorkflow({ ...live, pendingStatus: 'in_review', pendingPreparedBy: other }, me)).toMatchObject({ message: 'changeReviewOther', actions: ['approve', 'return'], canEdit: false });
  });

  it('only reopens an archived programme', () => {
    expect(programmeWorkflow(state({ status: 'archived' }), me)).toMatchObject({ actions: ['reopen'], canEdit: false });
  });
});

describe('changedFields', () => {
  it('lists only the changed fields, in words, ignoring the order of lists', () => {
    const live = { name: 'Diploma A', durationSemesters: 6, fieldIds: ['x', 'y'], hasInterview: false };
    const proposed = { name: 'Diploma B', durationSemesters: 6, fieldIds: ['y', 'x'], hasInterview: true };
    expect(
      changedFields(live, proposed, {
        name: (v) => String(v),
        durationSemesters: (v) => `${v} semester`,
        fieldIds: (v) => (v as string[]).join(', '),
        hasInterview: (v) => (v ? 'Ya' : 'Tidak'),
      }),
    ).toEqual([
      { field: 'name', before: 'Diploma A', after: 'Diploma B' },
      { field: 'hasInterview', before: 'Tidak', after: 'Ya' },
    ]);
  });
});
