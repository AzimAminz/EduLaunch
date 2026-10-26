'use client';

import { useState } from 'react';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';

export type ComboboxOption = DropdownOption;

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

/** A search filter in a GET form (the navy search panel): the system dropdown plus a hidden input. */
export function Combobox({ name, label, allLabel, noMatchesLabel, options, defaultValue = '', searchable = true }: ComboboxProps) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Dropdown
        label={label}
        labelClassName="text-sm font-semibold text-white"
        value={value}
        onChange={setValue}
        options={[{ value: '', label: allLabel }, ...options]}
        placeholder={allLabel}
        noMatchesLabel={noMatchesLabel}
        searchable={searchable}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
