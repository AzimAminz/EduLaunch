import { randomUUID } from 'node:crypto';
import { connectTestDatabase } from '@edulaunch/nest-kit/testing';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../infrastructure/db/schema.js';
import { AdminQueries } from './admin.module.js';

const { db, close } = connectTestDatabase(schema);
const queries = new AdminQueries(db);

const tag = `IT${randomUUID().slice(0, 8)}`;
const institutionId = randomUUID();
const withRules = randomUUID();
const withoutRules = randomUUID();
const draft = randomUUID();

beforeAll(async () => {
  await db.insert(schema.institutions).values({ id: institutionId, name: `Universiti ${tag}`, type: 'public_university' });
  await db.insert(schema.programs).values([
    { id: withRules, institutionId, name: `Diploma Bersyarat ${tag}`, studyLevel: 'diploma', publishStatus: 'published' },
    { id: withoutRules, institutionId, name: `Diploma Tanpa Syarat ${tag}`, studyLevel: 'diploma', publishStatus: 'published' },
    { id: draft, institutionId, name: `Diploma Draf ${tag}`, studyLevel: 'diploma', publishStatus: 'draft' },
  ]);
  await db.insert(schema.requirements).values({ programId: withRules, preparedBy: randomUUID(), entryRoute: 'spm', versionNo: 1, reviewStatus: 'published' });
});

afterAll(async () => {
  await db.delete(schema.requirements).where(eq(schema.requirements.programId, withRules));
  await db.delete(schema.programs).where(inArray(schema.programs.id, [withRules, withoutRules, draft]));
  await db.delete(schema.institutions).where(eq(schema.institutions.id, institutionId));
  await close();
});

describe('AdminQueries (integration)', () => {
  it('counts each institution programmes by status', async () => {
    const found = (await queries.institutions()).find((i) => i.id === institutionId);
    expect(found).toMatchObject({ programmes: 3, published: 2, open: 1 });
  });

  it('lists published programmes that have no published requirement', async () => {
    const page = await queries.programmes({ institutionId, missingRequirements: true, page: 1, pageSize: 50 });
    expect(page.items.map((p) => p.id)).toEqual([withoutRules]);
  });

  it('sorts by a column in either direction, and pages the result', async () => {
    const byName = await queries.programmes({ institutionId, sort: 'name', direction: 'desc', page: 1, pageSize: 2 });
    expect(byName.total).toBe(3);
    expect(byName.items.map((p) => p.id)).toEqual([withoutRules, draft]);
    const second = await queries.programmes({ institutionId, sort: 'name', direction: 'desc', page: 2, pageSize: 2 });
    expect(second.items.map((p) => p.id)).toEqual([withRules]);
    const byStatus = await queries.programmes({ institutionId, sort: 'status', direction: 'asc', page: 1, pageSize: 50 });
    expect(byStatus.items[0]!.status).toBe('draft');
  });
});
