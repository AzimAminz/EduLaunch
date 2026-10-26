import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ms from '../../dictionaries/ms.json';

const nav = vi.hoisted(() => ({ pathname: '/ms/teroka' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname, useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/auth/actions', () => ({ signOut: vi.fn() }));
const { Sidebar } = await import('./sidebar');

// Node's own localStorage hides jsdom's in this test environment, so use a small in-memory one.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  clear: () => store.clear(),
});

const props = { locale: 'ms' as const, nav: ms.nav, language: ms.language, auth: ms.auth };

describe('Sidebar', () => {
  beforeEach(() => localStorage.clear());

  it('marks the current page', () => {
    render(<Sidebar {...props} account={null} />);
    expect(screen.getByRole('link', { name: 'Teroka program' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows who is logged in, linking to their profile, with a log out button', () => {
    render(<Sidebar {...props} account={{ name: 'Aina', email: 'aina@contoh.com' }} />);
    expect(screen.getByRole('link', { name: /Aina/ })).toHaveAttribute('href', '/ms/profil');
    expect(screen.getByRole('button', { name: 'Log keluar' })).toBeInTheDocument();
  });

  it('opens as a menu on phones and closes with Escape', async () => {
    render(<Sidebar {...props} account={null} />);
    const menu = screen.getAllByRole('button', { name: ms.nav.toggleSidebar })[0]!;
    expect(menu).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{Escape}');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  it('remembers the desktop "icons only" choice', async () => {
    const { unmount } = render(<Sidebar {...props} account={null} />);
    const toggle = screen.getAllByRole('button', { name: ms.nav.toggleSidebar })[1]!;
    await userEvent.click(toggle);
    expect(localStorage.getItem('edulaunch.sidebar.collapsed')).toBe('1');
    unmount();

    render(<Sidebar {...props} account={null} />);
    expect(screen.getAllByRole('button', { name: ms.nav.toggleSidebar })[1]).toHaveAttribute('aria-expanded', 'false');
  });
});
