import { randomUUID } from 'node:crypto';
import { connectTestDatabase } from '@edulaunch/nest-kit/testing';
import { inArray } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import { Program } from '../domain/program.js';
import { DrizzleProgramRepository } from './drizzle-program.repository.js';

const { db, close } = connectTestDatabase(schema);
const repo = new DrizzleProgramRepository(db);

// A unique word in every name keeps these tests apart from any other data in the database.
const tag = `IT${randomUUID().slice(0, 8)}`;
const institutionId = randomUUID();
const fieldA = randomUUID();
const fieldB = randomUUID();
const created: string[] = [];

const programme = (name: string, over: Partial<Parameters<typeof Program.restore>[1]> = {}) => {
  const id = randomUUID();
  created.push(id);
  return Program.restore(id, {
    institutionId,
    name: `${name} ${tag}`,
    studyLevel: 'diploma',
    durationSemesters: 6,
    fieldIds: [fieldA],
    publishStatus: 'published',
    ...over,
  });
};

beforeAll(async () => {
  await db.insert(schema.institutions).values({ id: institutionId, name: `Universiti ${tag}`, type: 'public_university' });
  await db.insert(schema.fields).values([
    { id: fieldA, name: `Computing ${tag}` },
    { id: fieldB, name: `Engineering ${tag}` },
  ]);
});

afterAll(async () => {
  if (created.length) await db.delete(schema.programs).where(inArray(schema.programs.id, created));
  await db.delete(schema.fields).where(inArray(schema.fields.id, [fieldA, fieldB]));
  await db.delete(schema.institutions).where(inArray(schema.institutions.id, [institutionId]));
  await close();
});

describe('DrizzleProgramRepository (integration)', () => {
  it('saves a programme with its fields and reads it back', async () => {
    const p = programme('Diploma Sains Komputer', { fieldIds: [fieldA, fieldB] });
    await repo.save(p);

    const found = (await repo.findById(p.id))!.toSnapshot();
    const expected = p.toSnapshot();
    expect({ ...found, fieldIds: [...found.fieldIds].sort() }).toEqual({ ...expected, fieldIds: [...expected.fieldIds].sort() });
  });

  it('updates on a second save and replaces the field links', async () => {
    const p = programme('Diploma Kejuruteraan');
    await repo.save(p);
    await repo.save(Program.restore(p.id, { ...p.toSnapshot(), name: `Diploma Kejuruteraan Elektrik ${tag}`, fieldIds: [fieldB] }));

    const found = (await repo.findById(p.id))!.toSnapshot();
    expect(found.name).toBe(`Diploma Kejuruteraan Elektrik ${tag}`);
    expect(found.fieldIds).toEqual([fieldB]);
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });

  it('hides drafts from students and filters by text, field and level', async () => {
    await repo.save(programme('Asasi Sains', { studyLevel: 'foundation', fieldIds: [fieldB] }));
    await repo.save(programme('Diploma Draf', { publishStatus: 'draft' }));

    const published = await repo.search({ query: tag, onlyPublished: true, page: 1, pageSize: 50 });
    expect(published.items.map((p) => p.name)).not.toContain(`Diploma Draf ${tag}`);

    const withDrafts = await repo.search({ query: tag, onlyPublished: false, page: 1, pageSize: 50 });
    expect(withDrafts.items.map((p) => p.name)).toContain(`Diploma Draf ${tag}`);

    const byField = await repo.search({ query: tag, fieldId: fieldB, onlyPublished: true, page: 1, pageSize: 50 });
    expect(byField.items.every((p) => p.toSnapshot().fieldIds.includes(fieldB))).toBe(true);

    const byLevel = await repo.search({ query: tag, studyLevel: 'foundation', onlyPublished: true, page: 1, pageSize: 50 });
    expect(byLevel.items.map((p) => p.name)).toEqual([`Asasi Sains ${tag}`]);
  });

  it('pages results and reports the full total', async () => {
    const page1 = await repo.search({ query: tag, onlyPublished: false, page: 1, pageSize: 2 });
    const page2 = await repo.search({ query: tag, onlyPublished: false, page: 2, pageSize: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(created.length);
    expect(new Set([...page1.items, ...page2.items].map((p) => p.id)).size).toBe(page1.items.length + page2.items.length);
  });
});
