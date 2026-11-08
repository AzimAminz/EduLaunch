'use client';

import { startRequirement, type AdminFormState } from '@/lib/admin/actions';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { useFormAction } from '@/components/ui/use-form-action';
import { IconText, buttonClass } from './ui';

/**
 * Starts the next version of a published requirement from its lines and opens it in the editor (or opens the draft
 * already started for that route). Students keep seeing the published version until the new one is approved.
 */
export function NewVersionButton({ locale, programId, entryRoute, sourceCategory, label, errors, primary = false }: {
  locale: Locale;
  programId: string;
  entryRoute: string;
  sourceCategory: string | null;
  label: string;
  errors: Dictionary['admin']['errors'];
  primary?: boolean;
}) {
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(startRequirement, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col items-start gap-1">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="entryRoute" value={entryRoute} />
      {sourceCategory && <input type="hidden" name="category" value={sourceCategory} />}
      <button type="submit" disabled={pending} className={buttonClass(primary ? 'primary' : 'secondary', 'sm')}>
        <IconText icon="pencil" busy={pending}>
          {label}
        </IconText>
      </button>
      {!pending && state.error && (
        <p role="alert" className="text-[12px] text-red">
          {errors[state.error]}
        </p>
      )}
    </form>
  );
}
