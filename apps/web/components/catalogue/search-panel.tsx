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
        <Combobox
          name="studyLevel"
          label={t.level}
          allLabel={t.allLevels}
          noMatchesLabel={t.noMatches}
          options={STUDY_LEVEL_OPTIONS.map((level) => ({ value: level, label: studyLevelLabel(level, dict) }))}
          defaultValue={filters.studyLevel}
          searchable={false}
        />
        <button type="submit" className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[9px] bg-yellow px-6 py-4 text-base font-semibold text-navy hover:brightness-95 lg:min-w-[200px]">
          <Icon src="/icons/search-button.svg" size={20} />
          {t.search}
        </button>
      </div>
    </Form>
  );
}
