'use client';

import { removeEntryRoute, type AdminFormState } from '@/lib/admin/actions';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert } from '@/components/auth/fields';
import { Modal } from '@/components/ui/modal';
import { useFormAction } from '@/components/ui/use-form-action';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';
import { FromField } from './from-field';

export type RemoveTarget = { programId: string; entryRoute: string; categories: string[]; draftId: string | null; name: string };

/** Confirms removing one route (or some of its categories) from a programme with the admin's own draft for it. */
export function RemoveDraftModal({ locale, open, target, texts, errors, onClose }: {
  locale: Locale;
  open: boolean;
  /** Kept while closing, so the dialog does not empty as it fades out. */
  target: RemoveTarget | null;
  texts: { title: string; body: string; yes: string; cancel: string };
  errors: Dictionary['admin']['errors'];
  onClose: () => void;
}) {
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(removeEntryRoute, {});
  if (!target) return null;
  const formId = `remove-${target.entryRoute}-${target.categories.join('-')}`;
  return (
    <Modal
      open={open}
      onClose={onClose}
      alert
      busy={pending}
      tone="danger"
      icon={<AdminIcon name="trash" size={20} />}
      title={format(texts.title, { name: target.name })}
      description={texts.body}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={pending} className={buttonClass('secondary')} data-autofocus>
            {texts.cancel}
          </button>
          <button type="submit" form={formId} disabled={pending} className={buttonClass('dangerSolid')}>
            <IconText icon="trash" busy={pending}>
              {texts.yes}
            </IconText>
          </button>
        </>
      }
    >
      <FormAlert>{!pending && state.error ? errors[state.error] : undefined}</FormAlert>
      <form id={formId} onSubmit={onSubmit} hidden>
        <input type="hidden" name="locale" value={locale} />
        <FromField />
        <input type="hidden" name="programId" value={target.programId} />
        <input type="hidden" name="entryRoute" value={target.entryRoute} />
        {target.draftId && <input type="hidden" name="draftId" value={target.draftId} />}
        {target.categories.map((c) => (
          <input key={c} type="hidden" name="categories" value={c} />
        ))}
      </form>
    </Modal>
  );
}
