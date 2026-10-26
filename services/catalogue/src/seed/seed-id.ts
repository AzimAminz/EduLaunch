import { createHash } from 'node:crypto';

/**
 * The same key always gives the same UUID (name-based, like UUID v5), so running the seed
 * again updates rows instead of creating duplicates.
 */
export function seedId(key: string): string {
  const hex = createHash('sha1').update(`edulaunch-seed:${key}`).digest('hex').slice(0, 32).split('');
  hex[12] = '5'; // version 5
  hex[16] = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16); // RFC 4122 variant
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Admins recorded on seeded requirements: a different admin approves than prepares, as the workflow requires. */
export const SEED_PREPARED_BY = seedId('admin:seed-preparer');
export const SEED_APPROVED_BY = seedId('admin:seed-approver');
