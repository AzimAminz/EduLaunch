import { InMemoryEventBus } from '@edulaunch/nest-kit';
import { Events } from '@edulaunch/contracts';
import { Institution } from './domain/institution.js';
import { InstitutionRepository } from './domain/institution.repository.js';
import { DeleteInstitution } from './institutions.module.js';

const utem = () => Institution.create('i1', { name: 'Universiti Teknikal Malaysia Melaka', shortName: 'UTeM', type: 'public_university', websiteUrl: null, state: 'Melaka' });

class FakeRepo extends InstitutionRepository {
  deleted: string[] = [];
  constructor(
    public institution: Institution | null,
    private readonly published: number,
  ) {
    super();
  }
  async findById() {
    return this.institution;
  }
  async save(i: Institution) {
    this.institution = i;
  }
  async deleteWithProgrammes(id: string) {
    this.deleted.push(id);
    return ['p1', 'p2'];
  }
  async countPublishedProgrammes() {
    return this.published;
  }
  async addSource() {
    return 's1';
  }
  async removeSource() {
    return true;
  }
}

const run = (repo: FakeRepo, events = new InMemoryEventBus()) => ({ use: new DeleteInstitution(repo, events), events });

describe('Institution', () => {
  it('checks the details, including the state', () => {
    expect(() => Institution.create('x', { name: 'UT', shortName: null, type: 'public_university', websiteUrl: null })).toThrow('3 to 160');
    expect(() => Institution.create('x', { name: 'Universiti Contoh', shortName: null, type: 'public_university', websiteUrl: null, state: 'Bangkok' })).toThrow('Unknown state');
    expect(utem().toSnapshot().state).toBe('Melaka');
  });

  it('is confirmed by typing its short name, or its name when it has none', () => {
    expect(utem().confirmationText).toBe('UTeM');
    expect(() => utem().requestDeletion('a', 'utm', false)).toThrow('Type UTeM');
    expect(utem().requestDeletion('a', ' utem ', false)).toBe('delete_now');
  });
});

describe('DeleteInstitution', () => {
  it('deletes at once, with everything under it, when students see none of its programmes', async () => {
    const repo = new FakeRepo(utem(), 0);
    const { use, events } = run(repo);
    expect(await use.execute({ id: 'i1', adminId: 'a', action: 'request', confirm: 'UTeM' })).toEqual({ status: 'deleted' });
    expect(repo.deleted).toEqual(['i1']);
    expect(events.published.map((e) => [e.name, e.payload])).toEqual([[Events.InstitutionDeleted, { institutionId: 'i1', programIds: ['p1', 'p2'] }]]);
  });

  it('waits for another admin when students can see some of its programmes', async () => {
    const repo = new FakeRepo(utem(), 3);
    const { use } = run(repo);
    expect(await use.execute({ id: 'i1', adminId: 'a', action: 'request', confirm: 'UTeM' })).toEqual({ status: 'requested' });
    expect(repo.deleted).toEqual([]);
    await expect(use.execute({ id: 'i1', adminId: 'a', action: 'approve' })).rejects.toThrow('Another admin');
    expect(await use.execute({ id: 'i1', adminId: 'b', action: 'approve' })).toEqual({ status: 'deleted' });
    expect(repo.deleted).toEqual(['i1']);
  });

  it('lets a super admin approve the delete they asked for', async () => {
    const repo = new FakeRepo(utem(), 3);
    const { use } = run(repo);
    await use.execute({ id: 'i1', adminId: 'a', superAdmin: true, action: 'request', confirm: 'UTeM' });
    expect(await use.execute({ id: 'i1', adminId: 'a', superAdmin: true, action: 'approve' })).toEqual({ status: 'deleted' });
  });

  it('can cancel a waiting delete', async () => {
    const repo = new FakeRepo(utem(), 3);
    const { use } = run(repo);
    await use.execute({ id: 'i1', adminId: 'a', action: 'request', confirm: 'UTeM' });
    expect(await use.execute({ id: 'i1', adminId: 'b', action: 'cancel' })).toEqual({ status: 'cancelled' });
    expect(repo.institution!.toSnapshot().deletionRequestedBy).toBeNull();
    await expect(use.execute({ id: 'i1', adminId: 'b', action: 'approve' })).rejects.toThrow('No delete');
  });

  it('reports an unknown institution', async () => {
    await expect(run(new FakeRepo(null, 0)).use.execute({ id: 'x', adminId: 'a', action: 'cancel' })).rejects.toThrow(/not found/);
  });
});
