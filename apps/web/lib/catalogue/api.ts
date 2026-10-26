import { cacheLife } from 'next/cache';
import { ProgramSummary, PublishedRequirement } from '@edulaunch/contracts';
import { z } from 'zod';
import type { Locale } from '../i18n/locale';
import { filtersToQuery, type ProgrammeFilters } from './search-params';

// Server-side calls go straight to the gateway; the browser uses the /api rewrite instead.
const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';

export class NotFoundError extends Error {}

async function get<T extends z.ZodType>(path: string, schema: T): Promise<z.infer<T>> {
  const res = await fetch(`${GATEWAY_URL}/api/catalogue${path}`, { headers: { accept: 'application/json' } });
  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`Catalogue request failed (${res.status}) for ${path}`);
  return schema.parse(await res.json());
}

const Field = z.object({ id: z.uuid(), name: z.string(), nameEn: z.string().nullable() });
const Subject = z.object({
  id: z.uuid(),
  name: z.string(),
  nameEn: z.string().nullable(),
  aliases: z.array(z.string()).default([]),
  qualification: z.string(),
  category: z.string().nullable(),
  isMandatory: z.boolean(),
});
const Institution = z.object({ id: z.uuid(), name: z.string(), shortName: z.string().nullable(), type: z.string() });

export type Field = z.infer<typeof Field>;

export type Subject = z.infer<typeof Subject>;

/** Name in the reader's language; falls back to the Bahasa Melayu name when no translation exists. */
export function localName(item: { name: string; nameEn: string | null }, locale: Locale): string {
  return locale === 'en' && item.nameEn ? item.nameEn : item.name;
}

export const fieldName = (field: Field, locale: Locale) => localName(field, locale);

/** Universities, fields and subjects change rarely, so they are cached for a few minutes. */
export async function getReferenceData() {
  'use cache';
  cacheLife('minutes');
  const [institutions, fields, subjects] = await Promise.all([
    get('/institutions', z.array(Institution)),
    get('/fields', z.array(Field)),
    get('/subjects', z.array(Subject)),
  ]);
  return { institutions, fields, subjects };
}

export async function searchProgrammes(filters: ProgrammeFilters, pageSize = 12) {
  const query = filtersToQuery(filters);
  return get(`/programmes?pageSize=${pageSize}${query ? `&${query}` : ''}`, z.object({ items: z.array(ProgramSummary), total: z.number(), page: z.number(), pageSize: z.number() }));
}

export async function getProgramme(id: string) {
  return get(`/programmes/${encodeURIComponent(id)}`, ProgramSummary);
}

export async function getPublishedRequirements(programIds: string[]) {
  if (programIds.length === 0) return [];
  return get(`/requirements/published?programIds=${programIds.join(',')}`, z.array(PublishedRequirement));
}
