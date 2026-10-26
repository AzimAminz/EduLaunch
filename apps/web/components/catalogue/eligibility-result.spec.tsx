import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ms from '../../dictionaries/ms.json';
import { EligibilityResult } from './eligibility-result';
import type { EligibilityAnswer } from '@/lib/recommendation/api';

const names = new Map([
  ['bm', 'Bahasa Melayu'],
  ['m', 'Matematik'],
  ['f', 'Fizik'],
  ['s', 'Sains'],
]);
const show = (answer: EligibilityAnswer) => render(<EligibilityResult locale="ms" answer={answer} subjectNames={names} t={ms.eligibility} routeNames={ms.requirements.routes} />);

const checked: EligibilityAnswer = {
  state: 'checked',
  entryRoute: 'spm',
  status: 'almost',
  isTargetBased: true,
  groups: [
    { passed: true, rules: [{ type: 'min_grade', subjectId: 'bm', required: 'C', actual: 'B', passed: true }] },
    { passed: false, rules: [{ type: 'min_grade', subjectId: 'm', required: 'B', actual: 'C+', passed: false }] },
    {
      passed: true,
      rules: [
        { type: 'min_grade', subjectId: 'f', required: 'C', actual: 'B', passed: true },
        { type: 'min_grade', subjectId: 's', required: 'C', actual: null, passed: false },
      ],
    },
  ],
};

describe('EligibilityResult', () => {
  it('shows the outcome for the student route, each requirement, and the target label', () => {
    show(checked);
    expect(screen.getByText('Hampir layak')).toBeInTheDocument();
    expect(screen.getByText('Berdasarkan gred sasaran anda, bukan keputusan sebenar.')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]!).getByText('Bahasa Melayu: perlu C, anda B')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Matematik: perlu B, anda C+')).toBeInTheDocument();
    expect(within(items[2]!).getByText('Salah satu daripada:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kemas kini keputusan' })).toHaveAttribute('href', '/ms/dokumen');
  });

  it('asks for results when none are confirmed', () => {
    show({ state: 'no_results', entryRoute: 'spm' });
    expect(screen.getByText(/laluan Lepasan SPM/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Isi keputusan saya' })).toBeInTheDocument();
  });

  it('explains a missing route and unverified requirements without guessing', () => {
    const { unmount } = show({ state: 'no_route', routes: ['spm'] });
    expect(screen.getByText(/Syarat yang ada: Lepasan SPM/)).toBeInTheDocument();
    unmount();
    show({ state: 'no_requirement' });
    expect(screen.getByText(/belum disahkan/)).toBeInTheDocument();
  });

  it('has no "update" button when the student is eligible', () => {
    show({ ...checked, status: 'eligible', isTargetBased: false });
    expect(screen.getByText('Anda memenuhi syarat')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Kemas kini keputusan' })).not.toBeInTheDocument();
  });
});
