import { localName, type getReferenceData } from '@/lib/catalogue/api';
import type { Locale } from '@/lib/i18n/locale';
import type { AcademicRecord } from '@/lib/profile/api';
import { sortRows, startingRows, type SubjectOption } from '@/lib/profile/records';

type Reference = Awaited<ReturnType<typeof getReferenceData>>;

/** The subjects a results form offers for one qualification, named in the page language. */
export const subjectOptions = (reference: Reference, qualification: string, lang: Locale): SubjectOption[] =>
  reference.subjects
    .filter((s) => s.qualification === qualification)
    .map((s) => ({ id: s.id, name: localName(s, lang), category: s.category, isMandatory: s.isMandatory, keywords: [s.name, s.nameEn ?? '', ...s.aliases].filter(Boolean) }));

/** A saved record's rows in form order, or the starting rows when nothing is saved yet. */
export const toRows = (record: AcademicRecord | null, subjects: SubjectOption[], lang: Locale) =>
  record ? sortRows(record.subjects.map((s) => ({ subjectId: s.subjectId, grade: s.grade, customName: s.customName })), subjects, lang) : startingRows(subjects, lang);
