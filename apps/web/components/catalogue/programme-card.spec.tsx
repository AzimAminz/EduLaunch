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
    render(<ProgrammeCard {...base} requirementStatus="published" />);
    expect(screen.getByRole('heading', { name: 'Diploma Sains Komputer' })).toBeInTheDocument();
    expect(screen.getByText('Politeknik Contoh B')).toBeInTheDocument();
    expect(screen.getByText('Diploma • 3 tahun')).toBeInTheDocument();
  });

  it('lists its fields', () => {
    render(<ProgrammeCard {...base} fields={['Seni & Reka Bentuk', 'Komputer & Teknologi Maklumat']} requirementStatus="published" />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Seni & Reka Bentuk', 'Komputer & Teknologi Maklumat']);
  });

  it('shows information only, with no pictures to upload', () => {
    const { container } = render(<ProgrammeCard {...base} requirementStatus="published" />);
    expect(container.querySelector('[data-world]')).toBeNull();
  });

  it('links to the programme page', () => {
    render(<ProgrammeCard {...base} requirementStatus="published" />);
    expect(screen.getByRole('link', { name: /Lihat program & syarat/ })).toHaveAttribute('href', base.href);
  });

  it('is honest about where the requirements stand', () => {
    const { rerender } = render(<ProgrammeCard {...base} requirementStatus="sample" />);
    expect(screen.getByText('Syarat: data contoh, belum disahkan')).toBeInTheDocument();
    rerender(<ProgrammeCard {...base} requirementStatus="published" />);
    expect(screen.getByText('Syarat kemasukan tersedia')).toBeInTheDocument();
    rerender(<ProgrammeCard {...base} requirementStatus="missing" />);
    expect(screen.getByText('Syarat: belum tersedia')).toBeInTheDocument();
  });

  it('uses the labels it is given, so it works in English too', () => {
    render(<ProgrammeCard {...base} labels={en.card} requirementStatus="missing" />);
    expect(screen.getByRole('link', { name: /View programme & requirements/ })).toBeInTheDocument();
    expect(screen.getByText('Requirements: not available yet')).toBeInTheDocument();
  });
});
