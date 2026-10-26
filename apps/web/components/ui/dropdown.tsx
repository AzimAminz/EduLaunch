'use client';

import { useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/icon';

export interface DropdownOption {
  value: string;
  label: string;
  /** Other words that find this option when typing (English name, short forms such as "Add Maths"). */
  keywords?: string[];
}

interface DropdownProps {
  label: string;
  /** Hide the label visually (it is still read by screen readers), e.g. inside a table row. */
  hideLabel?: boolean;
  labelClassName?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder: string;
  noMatchesLabel: string;
  /** false = pick from the list only (no typing), for short lists such as grades. */
  searchable?: boolean;
  /** When set, typing something not in the list offers to add it: `createLabel("Tasawwuf")` → "Add “Tasawwuf”". */
  createLabel?: (text: string) => string;
  onCreate?: (text: string) => void;
  /** Keeps the field empty after a choice: for "Add subject", which adds and starts again. */
  resetAfterChoice?: boolean;
  size?: 'md' | 'sm';
  invalid?: boolean;
  /** Yellow field, used for target grades. */
  highlight?: boolean;
  className?: string;
}

const CREATE = '\u0000create';

/**
 * The EduLaunch dropdown (ARIA combobox pattern), one look for every list in the system.
 * Searchable: click to open, type to narrow. Both modes: arrows and Enter to choose, Escape to cancel.
 */
export function Dropdown({
  label,
  hideLabel,
  labelClassName = 'text-sm font-semibold',
  value,
  onChange,
  options,
  placeholder,
  noMatchesLabel,
  searchable = true,
  createLabel,
  onCreate,
  resetAfterChoice,
  size = 'md',
  invalid,
  highlight,
  className = '',
}: DropdownProps) {
  const id = useId();
  const listId = `${id}-list`;
  const fieldRef = useRef<HTMLInputElement & HTMLDivElement>(null);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? '';
  // An empty value ("All …") leaves the search field empty so its placeholder shows.
  const textOf = (v: string) => (v ? labelOf(v) : '');

  const [text, setText] = useState(textOf(value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState(false);
  // Shown text follows the value when it changes from outside (unless the user is typing).
  const [shownFor, setShownFor] = useState(value);
  if (shownFor !== value && !typed) {
    setShownFor(value);
    setText(textOf(value));
  }

  const visible = useMemo(() => {
    const query = text.trim().toLocaleLowerCase();
    const list: DropdownOption[] =
      !searchable || !typed || !query
        ? options
        : options.filter((o) => [o.label, ...(o.keywords ?? [])].some((word) => word.toLocaleLowerCase().includes(query)));
    const exact = options.some((o) => o.label.toLocaleLowerCase() === query);
    if (createLabel && onCreate && typed && query && !exact) return [...list, { value: CREATE, label: createLabel(text.trim()) }];
    return list;
  }, [createLabel, onCreate, options, searchable, text, typed]);

  function openList() {
    if (open) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(option: DropdownOption) {
    if (option.value === CREATE) onCreate?.(text.trim());
    else onChange(option.value);
    setText(resetAfterChoice || option.value === CREATE ? '' : textOf(option.value));
    setOpen(false);
    setTyped(false);
  }

  function cancel() {
    setText(resetAfterChoice ? '' : textOf(value));
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
    'aria-invalid': invalid || undefined,
    'aria-activedescendant': open && visible[active] ? `${id}-opt-${active}` : undefined,
    onKeyDown,
    onBlur,
  };

  const small = size === 'sm';
  const border = invalid ? 'border-red' : highlight ? 'border-yellow' : 'border-[#8792a6]';

  return (
    <div className={`relative flex min-w-0 flex-col gap-2 ${className}`}>
      <label id={`${id}-label`} htmlFor={`${id}-field`} className={hideLabel ? 'sr-only' : labelClassName}>
        {label}
      </label>
      <div
        className={`flex cursor-pointer items-center rounded-xl border-[1.5px] ${border} ${highlight ? 'bg-yellow' : 'bg-white'} focus-within:ring-2 focus-within:ring-yellow ${
          small ? 'gap-1.5 rounded-[9px] px-3 py-2' : 'gap-2.5 px-4 py-[15px]'
        }`}
        onMouseDown={(e) => {
          if (e.target !== fieldRef.current) e.preventDefault();
          fieldRef.current?.focus();
          if (open && !searchable) cancel();
          else openList();
        }}
      >
        {searchable && <Icon src="/icons/search.svg" size={small ? 16 : 18} className="shrink-0" />}
        {searchable ? (
          <input
            ref={fieldRef}
            {...fieldA11y}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder={placeholder}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setTyped(true);
              setOpen(true);
              setActive(0);
            }}
            className={`min-w-0 flex-1 bg-transparent text-navy outline-none placeholder:text-muted ${small ? 'text-sm' : 'text-base'}`}
          />
        ) : (
          <div ref={fieldRef} {...fieldA11y} tabIndex={0} className={`min-w-0 flex-1 truncate font-semibold text-navy outline-none ${small ? 'text-sm' : 'text-base font-medium'}`}>
            {labelOf(value) || <span className="font-normal text-muted">{placeholder}</span>}
          </div>
        )}
        <Icon src="/icons/chevron-down.svg" size={small ? 16 : 20} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className={`absolute top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg ${small ? 'min-w-full' : 'w-full'}`}
        >
          {visible.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">{noMatchesLabel}</li>
          ) : (
            visible.map((option, i) => (
              <li
                key={option.value || 'empty'}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={option.value === value}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer whitespace-nowrap text-navy ${small ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-[15px]'} ${i === active ? 'bg-blue' : ''} ${
                  option.value === value ? 'font-semibold' : ''
                } ${option.value === CREATE ? 'border-t border-line font-semibold text-[#2f5bd3]' : ''}`}
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
