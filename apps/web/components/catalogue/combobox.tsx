'use client';

import { useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/icon';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  /** Form field name; the chosen value is sent in a hidden input ("" means all). */
  name: string;
  label: string;
  /** The first option, which clears the choice ("All universities"). Also shown when nothing is chosen. */
  allLabel: string;
  noMatchesLabel: string;
  options: ComboboxOption[];
  defaultValue?: string;
  /** false = pick from the list only (no typing), for short lists such as "Level". */
  searchable?: boolean;
}

/**
 * Dropdown with the same look everywhere (ARIA combobox pattern). Searchable: click to open,
 * type to narrow the list. Both modes: arrows and Enter to choose, Escape to cancel. Works inside a GET form.
 */
export function Combobox({ name, label, allLabel, noMatchesLabel, options, defaultValue = '', searchable = true }: ComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const fieldRef = useRef<HTMLInputElement & HTMLDivElement>(null);
  const labelOf = (value: string) => options.find((o) => o.value === value)?.label ?? '';

  const [value, setValue] = useState(defaultValue);
  const [text, setText] = useState(labelOf(defaultValue));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState(false);

  const all = useMemo(() => [{ value: '', label: allLabel }, ...options], [allLabel, options]);
  const visible = useMemo(() => {
    if (!searchable || !typed || !text.trim()) return all;
    const q = text.trim().toLocaleLowerCase();
    return options.filter((o) => o.label.toLocaleLowerCase().includes(q));
  }, [all, options, searchable, text, typed]);

  /** Opens the list with the current choice highlighted. */
  function openList() {
    if (open) return;
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(option: ComboboxOption) {
    setValue(option.value);
    setText(option.value ? option.label : '');
    setOpen(false);
    setTyped(false);
  }

  function cancel() {
    setText(labelOf(value));
    setOpen(false);
    setTyped(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return openList();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (visible.length ? (i + step + visible.length) % visible.length : 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      const option = visible[active];
      if (option) choose(option);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      cancel();
    } else if (!searchable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openList();
    }
  }

  function onBlur(e: FocusEvent<HTMLElement>) {
    if (!e.relatedTarget?.closest(`#${CSS.escape(listId)}`)) cancel();
  }

  const fieldA11y = {
    id: `${id}-field`,
    role: 'combobox' as const,
    'aria-expanded': open,
    'aria-controls': listId,
    'aria-labelledby': `${id}-label`,
    'aria-activedescendant': open && visible[active] ? `${id}-opt-${active}` : undefined,
    onKeyDown,
    onBlur,
  };

  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-2">
      <label id={`${id}-label`} htmlFor={`${id}-field`} className="text-sm font-semibold text-white">
        {label}
      </label>
      <div
        className="flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] border-[#8792a6] bg-white px-4 py-[15px] focus-within:ring-2 focus-within:ring-yellow"
        onMouseDown={(e) => {
          if (e.target !== fieldRef.current) e.preventDefault();
          fieldRef.current?.focus();
          if (open && !searchable) cancel();
          else openList();
        }}
      >
        {searchable && <Icon src="/icons/search.svg" size={18} className="shrink-0" />}
        {searchable ? (
          <input
            ref={fieldRef}
            {...fieldA11y}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder={allLabel}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setTyped(true);
              setOpen(true);
              setActive(0);
            }}
            className="min-w-0 flex-1 bg-transparent text-base text-navy outline-none placeholder:text-muted"
          />
        ) : (
          <div ref={fieldRef} {...fieldA11y} tabIndex={0} className="min-w-0 flex-1 truncate text-base font-medium text-navy outline-none">
            {labelOf(value) || allLabel}
          </div>
        )}
        <Icon src="/icons/chevron-down.svg" size={20} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      <input type="hidden" name={name} value={value} />

      {open && (
        <ul id={listId} role="listbox" aria-label={label} className="absolute top-full z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg">
          {visible.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">{noMatchesLabel}</li>
          ) : (
            visible.map((option, i) => (
              <li
                key={option.value || 'all'}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={option.value === value}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-4 py-2.5 text-[15px] text-navy ${i === active ? 'bg-blue' : ''} ${option.value === value ? 'font-semibold' : ''}`}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
