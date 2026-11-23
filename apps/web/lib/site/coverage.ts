import { cacheLife, cacheTag } from 'next/cache';
import { getReferenceData, searchProgrammes } from '../catalogue/api';

/**
 * What the landing page says about the catalogue: the institutions in it and how many programmes are published.
 * Cached for an hour; null when the catalogue cannot be reached, so the page simply leaves the section out.
 */
export async function catalogueCoverage(): Promise<{ institutions: Array<{ id: string; short: string | null; name: string }>; programmes: number } | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('catalogue-reference');
  try {
    const [{ institutions }, { total }] = await Promise.all([getReferenceData(), searchProgrammes({ page: 1 }, 1)]);
    return {
      institutions: institutions.map((i) => ({ id: i.id, short: i.shortName, name: i.name })).sort((a, b) => (a.short ?? a.name).localeCompare(b.short ?? b.name)),
      programmes: total,
    };
  } catch {
    return null;
  }
}
