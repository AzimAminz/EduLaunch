import { Institution } from './domain/institution.js';
import { InstitutionRepository } from './domain/institution.repository.js';
import { DeleteInstitution } from './institutions.module.js';

class FakeRepo extends InstitutionRepository {
  deleted: string[] = [];
  constructor(
    private readonly known: string[],
    private readonly programmes: number,
  ) {
    super();
  }
  async findById(id: string) {
    return this.known.includes(id) ? Institution.create(id, { name: 'Universiti Contoh', shortName: null, type: 'public_university', websiteUrl: null }) : null;
  }
  async save() {}
  async delete(id: string) {
    this.deleted.push(id);
  }
  async countProgrammes() {
    return this.programmes;
  }
}

describe('DeleteInstitution', () => {
  it('deletes an institution without programmes', async () => {
    const repo = new FakeRepo(['i1'], 0);
    await new DeleteInstitution(repo).execute({ id: 'i1' });
    expect(repo.deleted).toEqual(['i1']);
  });

  it('refuses while programmes still belong to it', async () => {
    const repo = new FakeRepo(['i1'], 3);
    await expect(new DeleteInstitution(repo).execute({ id: 'i1' })).rejects.toThrow(/3 programme/);
    expect(repo.deleted).toEqual([]);
  });

  it('reports an unknown institution', async () => {
    await expect(new DeleteInstitution(new FakeRepo([], 0)).execute({ id: 'x' })).rejects.toThrow(/not found/);
  });
});
