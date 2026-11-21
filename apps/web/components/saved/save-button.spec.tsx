import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ms from '@/dictionaries/ms.json';
import { SaveButton } from './save-button';

const setProgrammeSaved = vi.fn();
vi.mock('@/lib/profile/saved-actions', () => ({ setProgrammeSaved: (...args: unknown[]) => setProgrammeSaved(...args) }));

const id = '9eea2ee0-7f21-5ca6-99dd-bebaca945055';

describe('SaveButton', () => {
  beforeEach(() => setProgrammeSaved.mockReset());

  it('saves at once and stays saved when the save succeeds', async () => {
    setProgrammeSaved.mockResolvedValue({ ok: true, saved: true });
    render(<SaveButton locale="ms" programId={id} initialSaved={false} t={ms.saved.button} />);
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(screen.getByRole('button', { name: 'Disimpan' })).toHaveAttribute('aria-pressed', 'true');
    expect(setProgrammeSaved).toHaveBeenCalledWith('ms', id, true);
  });

  it('goes back and says why when the save fails', async () => {
    setProgrammeSaved.mockResolvedValue({ ok: false, error: 'limit' });
    render(<SaveButton locale="ms" programId={id} initialSaved={false} t={ms.saved.button} />);
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Simpan' })).toHaveAttribute('aria-pressed', 'false'));
    expect(screen.getByRole('alert')).toHaveTextContent(ms.saved.button.limit);
  });

  it('names the icon-only button for screen readers', () => {
    render(<SaveButton locale="ms" programId={id} initialSaved t={ms.saved.button} tone="icon" />);
    expect(screen.getByRole('button', { name: 'Disimpan' })).toBeInTheDocument();
  });
});
