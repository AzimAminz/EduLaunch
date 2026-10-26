import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ms from '../../dictionaries/ms.json';

vi.mock('@/lib/profile/actions', () => ({ saveAcademicRecord: vi.fn(async () => ({})) }));
const { SubjectTable } = await import('./subject-table');

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const subjects = [
  { id: id(1), name: 'Bahasa Melayu', category: 'core', isMandatory: true },
  { id: id(2), name: 'Matematik', category: 'core', isMandatory: true },
  { id: id(3), name: 'Fizik', category: 'science', isMandatory: false },
];

function setup(variant: 'target' | 'actual' = 'actual', status: 'none' | 'confirmed' = 'none') {
  render(
    <SubjectTable
      locale="ms"
      variant={variant}
      t={ms.academic}
      subjects={subjects}
      grades={['A+', 'A', 'B']}
      years={[2026, 2025]}
      initialYear={null}
      initialRows={[
        { subjectId: id(1), grade: 'A' },
        { subjectId: id(2), grade: '' },
      ]}
      status={status}
    />,
  );
}

const hidden = () => JSON.parse((document.querySelector('input[name=subjects]') as HTMLInputElement).value);

describe('SubjectTable', () => {
  it('shows one row per subject with its grade', () => {
    setup();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Bahasa Melayu', 'Matematik']);
    expect(screen.getByRole('combobox', { name: 'Gred Bahasa Melayu' })).toHaveValue('A');
    expect(screen.getByText('Semakan: 2 subjek · 1 belum bergred')).toBeInTheDocument();
  });

  it('adds a subject from the official list, and removes one with ×', async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '+ Tambah subjek' }), 'Fizik');
    expect(hidden().map((r: { subjectId: string }) => r.subjectId)).toEqual([id(1), id(2), id(3)]);

    await userEvent.click(screen.getByRole('button', { name: 'Buang Bahasa Melayu' }));
    expect(hidden().map((r: { subjectId: string }) => r.subjectId)).toEqual([id(2), id(3)]);
  });

  it('hides "Add subject" once every subject is listed', async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '+ Tambah subjek' }), 'Fizik');
    expect(screen.queryByRole('combobox', { name: '+ Tambah subjek' })).not.toBeInTheDocument();
  });

  it('sends every grade with the form', async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Gred Matematik' }), 'B');
    expect(hidden()).toEqual([
      { subjectId: id(1), grade: 'A' },
      { subjectId: id(2), grade: 'B' },
    ]);
    expect(screen.getByText('Semakan: 2 subjek · semua bergred')).toBeInTheDocument();
  });

  it('says when what is on screen differs from what is saved', async () => {
    setup('actual', 'confirmed');
    expect(screen.getByText('Disahkan')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Gred Matematik' }), 'B');
    expect(screen.getByText('Ada perubahan belum disimpan')).toBeInTheDocument();
  });

  it('labels target grades as targets', () => {
    setup('target');
    expect(screen.getByRole('columnheader', { name: 'Sasaran' })).toBeInTheDocument();
    expect(screen.getByText(/Sasaran bukan keputusan rasmi/)).toBeInTheDocument();
  });
});
