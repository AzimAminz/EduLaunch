'use server';

import { redirect } from 'next/navigation';
import { isLocale } from '../i18n/locale';
import { getAccessToken } from '../supabase/server';
import { saveCurrentRecord } from './api';
import { gradesFor, parseRecordSubmission, recordFormFor, type RecordFormError } from './records';

export interface RecordFormState {
  saved?: boolean;
  error?: RecordFormError;
}

const LEVEL_OF_VARIANT = { school: 'form1_3', target: 'form4_5', actual: 'after_spm', basic: 'after_preu' } as const;

/** Saves and confirms the whole results table. Students can only write their own records (checked by the profile service). */
export async function saveAcademicRecord(_prev: RecordFormState, form: FormData): Promise<RecordFormState> {
  const locale = String(form.get('locale'));
  const variant = String(form.get('variant')) as keyof typeof LEVEL_OF_VARIANT;
  if (!(variant in LEVEL_OF_VARIANT)) return { error: 'generic' };
  const record = recordFormFor(LEVEL_OF_VARIANT[variant]);

  const parsed = parseRecordSubmission(form, gradesFor(record.qualification));
  if ('error' in parsed) return { error: parsed.error };

  const token = await getAccessToken();
  if (!token) redirect(`/${isLocale(locale) ? locale : 'ms'}/log-masuk`);
  try {
    await saveCurrentRecord(token, { qualification: record.qualification, kind: record.kind, ...parsed });
  } catch {
    return { error: 'generic' };
  }
  return { saved: true };
}
