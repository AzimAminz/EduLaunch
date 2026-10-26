import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import en from '../../dictionaries/en.json';
import ms from '../../dictionaries/ms.json';
import { ProgrammeCard } from './programme-card';

const base = {
  id: 'c159b4ac-872f-50af-bffa-adf4af8b5daf',
  programmeName: 'Diploma Sains Komputer',
  institutionName: 'Politeknik Contoh B',
  meta: 'Diploma • 3 tahun',
  world: 'science' as const,
  background: '#ffd84d',
  href: '/ms/teroka/c159b4ac-872f-50af-bffa-adf4af8b5daf',
  labels: ms.card,
};

describe('ProgrammeCard', () => {
  it('shows the institution, the programme and its level', () => {
    render(<ProgrammeCard {...base} requirementStatus="published" />);
    expect(screen.getByRole('heading', { name: 'Politeknik Contoh B' })).toBeInTheDocument();
    expect(screen.getByText('Diploma Sains Komputer')).toBeInTheDocument();
    expect(screen.getByText('Diploma • 3 tahun')).toBeInTheDocument();
  });

  it('links to the programme page', () => {
    render(<ProgrammeCard {...base} requirementStatus="published" />);
    expect(screen.getByRole('link', { name: /Lihat program & syarat/ })).toHaveAttribute('href', '/ms/teroka/c159b4ac-872f-50af-bffa-adf4af8b5daf');
  });

  it('is honest about where the requirements stand', () => {
    const { rerender } = render(<ProgrammeCard {...base} requirementStatus="sample" />);
    expect(screen.getByText('Syarat: data contoh, belum disahkan')).toBeInTheDocument();
    rerender(<ProgrammeCard {...base} requirementStatus="published" />);
    expect(screen.getByText('Syarat kemasukan tersedia')).toBeInTheDocument();
    rerender(<ProgrammeCard {...base} requirementStatus="missing" />);
    expect(screen.getByText('Syarat: belum tersedia')).toBeInTheDocument();
  });

  it('shows the illustration for its field on the field colour', () => {
    const { container } = render(<ProgrammeCard {...base} requirementStatus="published" />);
    const visual = container.querySelector<HTMLElement>('[data-world="science"]')!;
    expect(visual).toBeInTheDocument();
    expect(visual.style.backgroundPosition).toBe('-280px 0px');
    expect(visual.parentElement!.style.backgroundColor).toBe('rgb(255, 216, 77)');
  });

  it('uses the labels it is given, so it works in English too', () => {
    render(<ProgrammeCard {...base} labels={en.card} requirementStatus="missing" />);
    expect(screen.getByRole('link', { name: /View programme & requirements/ })).toBeInTheDocument();
    expect(screen.getByText('Requirements: not available yet')).toBeInTheDocument();
  });
});
