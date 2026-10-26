import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from './combobox';

const options = [
  { value: 'a', label: 'Universiti Contoh A' },
  { value: 'b', label: 'Politeknik Contoh B' },
  { value: 'c', label: 'Kolej Komuniti Contoh C' },
];

function setup(defaultValue?: string) {
  const user = userEvent.setup();
  const { container } = render(
    <form>
      <Combobox name="institutionId" label="Universiti" allLabel="Semua universiti" noMatchesLabel="Tiada padanan" options={options} defaultValue={defaultValue} />
    </form>,
  );
  const hidden = () => container.querySelector<HTMLInputElement>('input[type="hidden"][name="institutionId"]')!;
  return { user, hidden, input: screen.getByRole('combobox', { name: 'Universiti' }) };
}

describe('Combobox', () => {
  it('starts on "all" with an empty value', () => {
    const { input, hidden } = setup();
    expect(input).toHaveAttribute('placeholder', 'Semua universiti');
    expect(input).toHaveValue('');
    expect(hidden().value).toBe('');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the full list on click, with the "all" choice first', async () => {
    const { user, input } = setup();
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Semua universiti', ...options.map((o) => o.label)]);
  });

  it('filters as you type, ignoring upper and lower case', async () => {
    const { user, input } = setup();
    await user.type(input, 'komuniti');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Kolej Komuniti Contoh C']);
  });

  it('says so when nothing matches', async () => {
    const { user, input } = setup();
    await user.type(input, 'zzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('Tiada padanan')).toBeInTheDocument();
  });

  it('selects an option with a click and closes the list', async () => {
    const { user, input, hidden } = setup();
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'Politeknik Contoh B' }));
    expect(hidden().value).toBe('b');
    expect(input).toHaveValue('Politeknik Contoh B');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('highlights the first match while typing, so Enter picks it straight away', async () => {
    const { user, input, hidden } = setup();
    await user.type(input, 'komuniti{Enter}');
    expect(hidden().value).toBe('c');
  });

  it('works with the keyboard: arrows to move, Enter to choose', async () => {
    const { user, input, hidden } = setup();
    await user.type(input, 'contoh');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(hidden().value).toBe('b');
  });

  it('closes on Escape and keeps the previous choice', async () => {
    const { user, input, hidden } = setup('a');
    await user.clear(input);
    await user.type(input, 'kol');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('Universiti Contoh A');
    expect(hidden().value).toBe('a');
  });

  it('shows a preselected value and can be cleared with the "all" choice', async () => {
    const { user, input, hidden } = setup('c');
    expect(input).toHaveValue('Kolej Komuniti Contoh C');
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'Semua universiti' }));
    expect(hidden().value).toBe('');
    expect(input).toHaveValue('');
  });

  describe('select-only mode (searchable={false}), used for "Level"', () => {
    function setupSelect(defaultValue?: string) {
      const user = userEvent.setup();
      const levels = [
        { value: 'diploma', label: 'Diploma' },
        { value: 'degree', label: 'Ijazah sarjana muda' },
      ];
      const { container } = render(
        <Combobox name="studyLevel" label="Peringkat" allLabel="Semua peringkat" noMatchesLabel="Tiada padanan" options={levels} defaultValue={defaultValue} searchable={false} />,
      );
      const hidden = () => container.querySelector<HTMLInputElement>('input[type="hidden"][name="studyLevel"]')!;
      return { user, hidden, container, field: screen.getByRole('combobox', { name: 'Peringkat' }) };
    }

    it('shows the current choice as text, with no search icon and no typing', async () => {
      const { user, field, container } = setupSelect();
      expect(field).toHaveTextContent('Semua peringkat');
      expect(container.querySelector('img[src*="search"]')).toBeNull();
      await user.click(field);
      await user.keyboard('xyz');
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('opens the same styled list and selects with a click', async () => {
      const { user, field, hidden } = setupSelect();
      await user.click(field);
      await user.click(screen.getByRole('option', { name: 'Ijazah sarjana muda' }));
      expect(hidden().value).toBe('degree');
      expect(field).toHaveTextContent('Ijazah sarjana muda');
      expect(field).toHaveAttribute('aria-expanded', 'false');
    });

    it('works with the keyboard and keeps a preselected value', async () => {
      const { user, field, hidden } = setupSelect('diploma');
      expect(field).toHaveTextContent('Diploma');
      field.focus();
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(hidden().value).toBe('degree');
      await user.keyboard('{ArrowDown}{Escape}');
      expect(hidden().value).toBe('degree');
    });
  });
});
