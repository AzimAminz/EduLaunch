import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ms from '../../dictionaries/ms.json';

vi.mock('@/lib/profile/actions', () => ({ saveAcademicRecord: vi.fn(async () => ({})) }));
const { SubjectTable } = await import('./subject-table');

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const subjects = [
  { id: id(1), name: 'Bahasa Melayu', category: 'core', isMandatory: true, keywords: [] },
  { id: id(2), name: 'Matematik', category: 'core', isMandatory: true, keywords: [] },
  { id: id(3), name: 'Fizik', category: 'science', isMandatory: false, keywords: ['Physics'] },
  { id: id(4), name: 'Matematik Tambahan', category: 'science', isMandatory: false, keywords: ['Add Maths'] },
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

const rows = () => JSON.parse((document.querySelector('input[name=subjects]') as HTMLInputElement).value) as Array<{ subjectId: string; grade: string; customName?: string }>;
const pick = async (field: string, option: string) => {
  await userEvent.click(screen.getByRole('combobox', { name: field }));
  await userEvent.click(screen.getByRole('option', { name: option }));
};
const addField = () => screen.getByRole('combobox', { name: '+ Tambah subjek' });

describe('SubjectTable', () => {
  it('shows one row per subject with its grade, and how many still need one', () => {
    setup();
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Bahasa Melayu', 'Matematik']);
    expect(screen.getByRole('combobox', { name: 'Gred Bahasa Melayu' })).toHaveTextContent('A');
    expect(screen.getByText('Semakan: 2 subjek · 1 belum bergred')).toBeInTheDocument();
  });

  it('picks grades with the system dropdown and sends them with the form', async () => {
    setup();
    await pick('Gred Matematik', 'B');
    expect(rows()).toEqual([
      { subjectId: id(1), grade: 'A' },
      { subjectId: id(2), grade: 'B' },
    ]);
    expect(screen.queryByText(/belum bergred/)).not.toBeInTheDocument();
  });

  it('finds official subjects by another name and adds them; × removes a row', async () => {
    setup();
    await userEvent.type(addField(), 'add maths');
    await userEvent.click(screen.getByRole('option', { name: 'Matematik Tambahan' }));
    expect(rows().map((r) => r.subjectId)).toEqual([id(1), id(2), id(4)]);

    await userEvent.click(screen.getByRole('button', { name: 'Buang Bahasa Melayu' }));
    expect(rows().map((r) => r.subjectId)).toEqual([id(2), id(4)]);
  });

  it('keeps a subject that is not in the official list under the typed name', async () => {
    setup();
    await userEvent.type(addField(), 'Tasawwuf');
    await userEvent.click(screen.getByRole('option', { name: '+ Tambah “Tasawwuf” sebagai subjek lain' }));
    expect(rows().at(-1)).toMatchObject({ grade: '', customName: 'Tasawwuf' });
    expect(screen.getByRole('rowheader', { name: 'Tasawwuf' })).toBeInTheDocument();
    expect(screen.getByText('Subjek lain')).toBeInTheDocument();
  });

  it('adds the official subject when the typed name matches one', async () => {
    setup();
    await userEvent.type(addField(), 'physics{Enter}');
    expect(rows().map((r) => r.subjectId)).toContain(id(3));
    expect(rows().some((r) => r.customName)).toBe(false);
  });

  it('says when what is on screen differs from what is saved', async () => {
    setup('actual', 'confirmed');
    expect(screen.getByText('Disahkan')).toBeInTheDocument();
    await pick('Gred Matematik', 'B');
    expect(screen.getByText('Ada perubahan belum disimpan')).toBeInTheDocument();
  });

  it('labels target grades as targets', () => {
    setup('target');
    expect(screen.getByRole('columnheader', { name: 'Sasaran' })).toBeInTheDocument();
    expect(screen.getByText(/Sasaran bukan keputusan rasmi/)).toBeInTheDocument();
  });

  it('stops offering more subjects at the limit, and says why', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ subjectId: `00000000-0000-4000-8000-${String(i + 100).padStart(12, '0')}`, grade: 'A', customName: `Subjek ${i + 1}` }));
    render(<SubjectTable locale="ms" variant="actual" t={ms.academic} subjects={subjects} grades={['A']} years={[2026]} initialYear={2026} initialRows={many} status="none" />);
    expect(screen.queryByRole('combobox', { name: '+ Tambah subjek' })).not.toBeInTheDocument();
    expect(screen.getByText(/Had 30 subjek dicapai/)).toBeInTheDocument();
  });
});
