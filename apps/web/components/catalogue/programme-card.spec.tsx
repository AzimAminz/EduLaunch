import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import en from '../../dictionaries/en.json';
import ms from '../../dictionaries/ms.json';
import { ProgrammeCard } from './programme-card';

const base = {
  id: 'c159b4ac-872f-50af-bffa-adf4af8b5daf',
  href: '/ms/teroka/c159b4ac-872f-50af-bffa-adf4af8b5daf',
  programmeName: 'Diploma Sains Komputer',
  institutionName: 'Politeknik Contoh B',
  meta: 'Diploma • 3 tahun',
  fields: ['Komputer & Teknologi Maklumat'],
  labels: ms.card,
};

describe('ProgrammeCard', () => {
  it('leads with the programme name, then the institution and its level', () => {
    render(<ProgrammeCard {...base} />);
    expect(screen.getByRole('heading', { name: 'Diploma Sains Komputer' })).toBeInTheDocument();
    expect(screen.getByText('Politeknik Contoh B')).toBeInTheDocument();
    expect(screen.getByText('Diploma • 3 tahun')).toBeInTheDocument();
  });

  it('lists up to two fields and says how many more there are', () => {
    render(<ProgrammeCard {...base} fields={['Seni & Reka Bentuk', 'Komputer & Teknologi Maklumat', 'Pendidikan']} />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Seni & Reka Bentuk', 'Komputer & Teknologi Maklumat', '+1']);
  });

  it('shows information only, with no pictures to upload', () => {
    const { container } = render(<ProgrammeCard {...base} />);
    expect(container.querySelector('[data-world]')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('opens the programme from its name (the whole card is the link)', () => {
    render(<ProgrammeCard {...base} />);
    expect(screen.getByRole('link', { name: 'Diploma Sains Komputer' })).toHaveAttribute('href', base.href);
  });

  it('shows the average merit with its year when there is one, and marks sample data', () => {
    const { rerender } = render(<ProgrammeCard {...base} averageMerit={{ intakeYear: 2026, value: 84.87 }} />);
    expect(screen.getByText('Purata merit 2026')).toBeInTheDocument();
    expect(screen.getByText('84.87')).toBeInTheDocument();
    rerender(<ProgrammeCard {...base} sample />);
    expect(screen.getByText('Data contoh')).toBeInTheDocument();
  });

  it('uses the labels it is given, so it works in English too', () => {
    render(<ProgrammeCard {...base} labels={en.card} averageMerit={{ intakeYear: 2026, value: 80 }} />);
    expect(screen.getByText('View programme →')).toBeInTheDocument();
    expect(screen.getByText('Average merit 2026')).toBeInTheDocument();
  });
});
