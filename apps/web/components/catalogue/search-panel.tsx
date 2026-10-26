import Form from 'next/form';
import type { Dictionary } from '@/lib/i18n/locale';
import { STUDY_LEVEL_OPTIONS, studyLevelLabel } from '@/lib/catalogue/presentation';
import type { ProgrammeFilters } from '@/lib/catalogue/search-params';
import { Combobox, type ComboboxOption } from './combobox';
import { Icon } from '@/components/ui/icon';

interface SearchPanelProps {
  action: string;
  filters: ProgrammeFilters;
  institutions: ComboboxOption[];
  fields: ComboboxOption[];
  dict: Dictionary;
}

/** The navy "Cari pilihan pengajian" panel. A GET form, so results have a shareable address. */
export function SearchPanel({ action, filters, institutions, fields, dict }: SearchPanelProps) {
  const t = dict.directory;
  return (
    <Form action={action} className="flex flex-col gap-5 rounded-[18px] bg-navy p-6">
      <h2 className="text-[23px] font-semibold leading-tight text-white">{t.searchTitle}</h2>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <Combobox name="institutionId" label={t.university} allLabel={t.allUniversities} noMatchesLabel={t.noMatches} options={institutions} defaultValue={filters.institutionId} />
        <Combobox name="fieldId" label={t.field} allLabel={t.allFields} noMatchesLabel={t.noMatches} options={fields} defaultValue={filters.fieldId} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="studyLevel" className="text-sm font-semibold text-white">
            {t.level}
          </label>
          <select
            id="studyLevel"
            name="studyLevel"
            defaultValue={filters.studyLevel ?? ''}
            className="w-full appearance-none rounded-xl border-[1.5px] border-[#758aa8] bg-white bg-[url(/icons/chevron-down.svg)] bg-[length:20px] bg-[right_16px_center] bg-no-repeat px-4 py-[15px] text-base font-medium text-navy"
          >
            <option value="">{t.allLevels}</option>
            {STUDY_LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {studyLevelLabel(level, dict)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="flex shrink-0 items-center justify-center gap-2 rounded-[9px] bg-yellow p-4 text-base font-semibold text-navy hover:brightness-95 lg:w-[200px]">
          <Icon src="/icons/search-button.svg" size={20} />
          {t.search}
        </button>
      </div>
    </Form>
  );
}
