import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ms from '../../dictionaries/ms.json';

vi.mock('@/lib/profile/actions', () => ({ saveHigherResults: vi.fn(async () => ({})) }));
const { HigherResultsForm } = await import('./higher-results-form');

type Initial = Parameters<typeof HigherResultsForm>[0]['initial'];
const empty: Initial = { examYear: null, cgpa: null, muetBand: null, fieldId: null, programmeName: null, qualificationLevel: null, stream: null, customFieldName: null, semesterGpas: null, rows: [] };
const subjects = [{ id: '00000000-0000-4000-8000-000000000001', name: 'Pengajian Am', category: 'core', isMandatory: true, keywords: [] }];
const matriculationSubjects = ['Matematik', 'Kimia', 'Fizik', 'Biologi', 'Sains Komputer'].map((n, i) => {
  const name = `${n} (Matrikulasi)`;
  return { id: `00000000-0000-4000-8000-00000000010${i}`, name, category: 'science', isMandatory: false, keywords: [name] };
});

function setup(qualification: 'diploma' | 'stpm' | 'a_level' | 'matriculation' | 'skm' | 'certificate' | 'foundation', initial: Initial = empty) {
  render(
    <HigherResultsForm
      locale="ms"
      qualification={qualification}
      t={ms.higher}
      academic={ms.academic}
      subjects={qualification === 'stpm' || qualification === 'a_level' ? subjects : qualification === 'matriculation' || qualification === 'foundation' ? matriculationSubjects : []}
      grades={['A', 'B', 'C']}
      fields={[{ value: '00000000-0000-4000-8000-000000000009', label: 'Komputer & Teknologi Maklumat' }]}
      years={[2026, 2025]}
      initial={initial}
      status="none"
    />,
  );
}

describe('HigherResultsForm', () => {
  it('asks a diploma holder for field, programme, CGPA, MUET and year, without subject grades', () => {
    setup('diploma');
    expect(screen.getByRole('combobox', { name: 'Bidang' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nama program')).toBeInTheDocument();
    expect(screen.getByLabelText('PNGK / CGPA')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'MUET' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Tahun tamat' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('asks matriculation for its stream, then fills in the stream subjects', async () => {
    setup('matriculation');
    expect(screen.getByLabelText('PNGK / CGPA')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Bidang' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Jurusan' }));
    await userEvent.click(screen.getByRole('option', { name: 'Sains · Modul I (Biologi, Fizik)' }));
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual(['Matematik (Matrikulasi)', 'Kimia (Matrikulasi)', 'Fizik (Matrikulasi)', 'Biologi (Matrikulasi)']);
  });

  it('lets foundation students add subject grades if they want, with field and programme', () => {
    setup('foundation');
    expect(screen.getByRole('combobox', { name: 'Bidang' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gred subjek Asasi (pilihan)' })).toBeInTheDocument();
  });

  it('adds STPM subject grades, starting with Pengajian Am', () => {
    setup('stpm', { ...empty, rows: [{ subjectId: subjects[0]!.id, grade: '' }] });
    expect(screen.getByRole('heading', { name: 'Gred subjek STPM' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Pengajian Am' })).toBeInTheDocument();
  });

  it('has no CGPA for A-Level, which is graded by subject', () => {
    setup('a_level');
    expect(screen.queryByLabelText('PNGK / CGPA')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gred subjek A-Level' })).toBeInTheDocument();
  });

  it('asks SKM for its level and field, without CGPA', () => {
    setup('skm');
    expect(screen.getByRole('combobox', { name: 'Tahap' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Bidang' })).toBeInTheDocument();
    expect(screen.queryByLabelText('PNGK / CGPA')).not.toBeInTheDocument();
  });

  it('asks a certificate holder for field, programme and CGPA', () => {
    setup('certificate');
    expect(screen.getByRole('combobox', { name: 'Bidang' })).toBeInTheDocument();
    expect(screen.getByLabelText('PNGK / CGPA')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Tahap' })).not.toBeInTheDocument();
  });

  it('shows saved values', () => {
    setup('diploma', { ...empty, cgpa: 3.4, muetBand: 5.5, programmeName: 'Diploma Sains Komputer', examYear: 2025 });
    expect(screen.getByLabelText('PNGK / CGPA')).toHaveValue('3.40');
    expect(screen.getByRole('combobox', { name: 'MUET' })).toHaveTextContent('Band 5+');
    expect(screen.getByLabelText('Nama program')).toHaveValue('Diploma Sains Komputer');
  });

  it('starts matriculation and foundation with two semesters, and lets students add or remove one', async () => {
    setup('foundation');
    expect(screen.getByRole('heading', { name: 'Keputusan semester' })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Semester \d · PNGS/)).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: '+ Tambah semester' }));
    expect(screen.getAllByLabelText(/Semester \d · PNGS/)).toHaveLength(3);
    await userEvent.type(screen.getByLabelText('Semester 3 · PNGS'), '3.75');
    expect(JSON.parse((document.querySelector('input[name=semesterGpas]') as HTMLInputElement).value)).toEqual(['', '', '3.75']);
    await userEvent.click(screen.getByRole('button', { name: 'Buang semester 3' }));
    expect(screen.getAllByLabelText(/Semester \d · PNGS/)).toHaveLength(2);
  });

  it('has no semesters for a diploma', () => {
    setup('diploma');
    expect(screen.queryByRole('heading', { name: 'Keputusan semester' })).not.toBeInTheDocument();
  });

  it('keeps a field the student types when it is not in the list', async () => {
    setup('foundation');
    await userEvent.type(screen.getByRole('combobox', { name: 'Bidang' }), 'Sains Sukan');
    await userEvent.click(screen.getByRole('option', { name: '+ Tambah “Sains Sukan” sebagai bidang lain' }));
    expect((document.querySelector('input[name=customFieldName]') as HTMLInputElement).value).toBe('Sains Sukan');
    expect((document.querySelector('input[name=fieldId]') as HTMLInputElement).value).toBe('');
  });

  it('shows saved semesters and a typed field', () => {
    setup('matriculation', { ...empty, semesterGpas: [3.5, null, 3.8, 3.9], stream: 'science_1' });
    expect(screen.getAllByLabelText(/Semester \d · PNGS/)).toHaveLength(4);
    expect(screen.getByLabelText('Semester 1 · PNGS')).toHaveValue('3.50');
    expect(screen.getByLabelText('Semester 2 · PNGS')).toHaveValue('');
  });
});
