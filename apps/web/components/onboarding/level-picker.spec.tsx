import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import en from '../../dictionaries/en.json';
import ms from '../../dictionaries/ms.json';

vi.mock('@/lib/auth/actions', () => ({ chooseEducationLevel: vi.fn(async () => ({})) }));
const { LevelPicker } = await import('./level-picker');

describe('LevelPicker', () => {
  it('offers the five education levels', () => {
    render(<LevelPicker locale="ms" t={ms.onboarding} errors={ms.auth.errors} />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Teruskan ke dashboard' })).toBeInTheDocument();
  });

  it('asks which form for Form 1–3, and names it on the button', async () => {
    render(<LevelPicker locale="ms" t={ms.onboarding} errors={ms.auth.errors} />);
    await userEvent.click(screen.getByLabelText(/Tingkatan 1–3/));
    expect(screen.getByRole('radiogroup', { name: 'Tingkatan:' })).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('3'));
    expect(screen.getByRole('button', { name: 'Teruskan ke dashboard Tingkatan 3' })).toBeInTheDocument();
  });

  it('needs no form for levels after school', async () => {
    render(<LevelPicker locale="en" t={en.onboarding} errors={en.auth.errors} />);
    await userEvent.click(screen.getByLabelText(/After SPM/));
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to the after-SPM dashboard' })).toBeInTheDocument();
  });
});
