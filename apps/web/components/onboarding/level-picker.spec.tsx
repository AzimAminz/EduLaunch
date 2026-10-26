import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import en from '../../dictionaries/en.json';
import ms from '../../dictionaries/ms.json';

const actions = vi.hoisted(() => ({
  chooseEducationLevel: vi.fn(async () => ({})),
  previewEducationLevel: vi.fn(async (...args: [FormData?]): Promise<{ remove: Array<{ id: string; qualification: string; kind: string; examYear: number | null }> }> => (void args, { remove: [] })),
}));
vi.mock('@/lib/auth/actions', () => actions);
const { LevelPicker } = await import('./level-picker');

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
beforeEach(() => vi.clearAllMocks());

const names = (d: typeof ms) => ({ qualifications: d.higher.qualifications, records: d.academic.history.labels, noYear: d.academic.history.noYear });
const setup = (props: Partial<Parameters<typeof LevelPicker>[0]> = {}) =>
  render(<LevelPicker locale="ms" t={ms.onboarding} errors={ms.auth.errors} names={names(ms)} {...props} />);

describe('LevelPicker', () => {
  it('offers the five education levels', () => {
    setup();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Teruskan ke dashboard' })).toBeInTheDocument();
  });

  it('asks which form for Form 1–3, and names it on the button', async () => {
    setup();
    await userEvent.click(screen.getByLabelText(/Tingkatan 1–3/));
    expect(screen.getByRole('radiogroup', { name: 'Tingkatan:' })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('3'));
    expect(screen.getByRole('button', { name: 'Teruskan ke dashboard Tingkatan 3' })).toBeInTheDocument();
  });

  it('needs no form for levels after school', async () => {
    render(<LevelPicker locale="en" t={en.onboarding} errors={en.auth.errors} names={names(en)} />);
    await userEvent.click(screen.getByLabelText(/After SPM/));
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to the after-SPM dashboard' })).toBeInTheDocument();
  });

  it('asks the qualification in a dialog after pre-university, then saves it', async () => {
    setup();
    await userEvent.click(screen.getByLabelText(/Lepasan STPM/));
    await userEvent.click(screen.getByRole('button', { name: /Teruskan ke dashboard/ }));
    const dialog = screen.getByRole('dialog', { name: 'Sahkan perubahan tahap' });
    expect(screen.getByRole('button', { name: 'Sahkan & simpan' })).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Asasi'));
    await waitFor(() => expect(screen.getByText(/Tiada rekod akan dipadam/)).toBeInTheDocument());
    const previewed = actions.previewEducationLevel.mock.calls.at(-1) as unknown as [FormData];
    expect(previewed[0].get('higherQualification')).toBe('foundation');

    await userEvent.click(screen.getByRole('button', { name: 'Sahkan & simpan' }));
    await waitFor(() => expect(actions.chooseEducationLevel).toHaveBeenCalled());
    expect((actions.chooseEducationLevel.mock.calls[0] as unknown as [unknown, FormData])[1].get('higherQualification')).toBe('foundation');
    expect(dialog).not.toHaveAttribute('open');
  });

  it('lists the records a change would delete and saves only after confirming', async () => {
    actions.previewEducationLevel.mockResolvedValueOnce({ remove: [{ id: 'r1', qualification: 'school', kind: 'school', examYear: 2025 }] });
    setup({ initial: { level: 'form1_3', formYear: 2, higherQualification: null }, savedLabel: 'Disimpan', submitLabel: 'Simpan tahap' });
    await userEvent.click(screen.getByLabelText('1'));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan tahap' }));

    await waitFor(() => expect(screen.getByText('Rekod ini akan dipadam')).toBeInTheDocument());
    expect(screen.getByText('Prestasi sekolah 2025')).toBeInTheDocument();
    expect(actions.chooseEducationLevel).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(actions.chooseEducationLevel).not.toHaveBeenCalled();
  });

  it('saves straight away on the profile when nothing would be deleted', async () => {
    setup({ initial: { level: 'form1_3', formYear: 1, higherQualification: null }, savedLabel: 'Disimpan', submitLabel: 'Simpan tahap' });
    await userEvent.click(screen.getByLabelText('2'));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan tahap' }));
    await waitFor(() => expect(actions.chooseEducationLevel).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
