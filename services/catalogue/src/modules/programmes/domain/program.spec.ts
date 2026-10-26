import { NO_FACTS, Program, type ProgramDetails } from './program.js';

const institutionId = '00000000-0000-4000-8000-000000000001';
const details: ProgramDetails = { institutionId, name: 'Diploma Sains Komputer', studyLevel: 'diploma', durationSemesters: 6, fieldIds: [] };
const draft = (by = 'admin-a') => Program.create('p1', details, by);

describe('Program', () => {
  it('starts as a draft students cannot see', () => {
    const p = draft();
    expect(p.status).toBe('draft');
    expect(p.isVisibleToStudents).toBe(false);
  });

  it('checks the details', () => {
    expect(() => Program.create('p', { ...details, name: ' ab ' })).toThrow('3 to 160');
    expect(() => Program.create('p', { ...details, institutionId: null })).toThrow('institution');
    expect(() => Program.create('p', { ...details, studyLevel: 'form4_stream' })).toThrow('Form 4');
    expect(() => Program.create('p', { ...details, durationSemesters: 0 })).toThrow('1 to 16');
    expect(Program.create('p', { ...details, name: '  Diploma Grafik  ' }).name).toBe('Diploma Grafik');
  });

  it('is published only after another admin approves it', () => {
    const p = draft();
    p.submitForReview('admin-a');
    expect(p.status).toBe('in_review');
    expect(() => p.approve('admin-a')).toThrow('Another admin');
    p.approve('admin-b');
    expect(p.status).toBe('published');
    expect(p.isVisibleToStudents).toBe(true);
    expect(p.toSnapshot().approvedBy).toBe('admin-b');
  });

  it('goes back to the preparer with a reason, who fixes and resubmits it', () => {
    const p = draft();
    p.submitForReview('admin-a');
    expect(() => p.returnToPreparer('admin-b', 'no')).toThrow('Explain');
    p.returnToPreparer('admin-b', 'Tempoh pengajian salah');
    expect(p.status).toBe('returned');
    expect(p.toSnapshot().returnReason).toBe('Tempoh pengajian salah');
    p.updateDetails('admin-a', { name: 'Diploma Sains Komputer', durationSemesters: 5, fieldIds: [] });
    p.submitForReview('admin-a');
    expect(p.toSnapshot().returnReason).toBeNull();
  });

  it('keeps a draft to the admin preparing it, and locks it while in review', () => {
    const p = draft();
    expect(() => p.updateDetails('admin-b', { name: 'Lain', durationSemesters: 6, fieldIds: [] })).toThrow('Only the admin');
    expect(() => p.submitForReview('admin-b')).toThrow('Only the admin');
    p.submitForReview('admin-a');
    expect(() => p.updateDetails('admin-a', { name: 'Diploma Baharu', durationSemesters: 6, fieldIds: [] })).toThrow('waiting for review');
  });

  it('lets any admin correct a published programme, archive it and reopen it as a draft', () => {
    const p = Program.restore('p', { ...NO_FACTS, ...details, publishStatus: 'published', preparedBy: null, approvedBy: null, returnReason: null });
    p.updateDetails('admin-c', { name: 'Diploma Sains Komputer (Rangkaian)', durationSemesters: 6, fieldIds: ['f', 'f'] });
    expect(p.toSnapshot().fieldIds).toEqual(['f']);
    p.archive();
    expect(p.isVisibleToStudents).toBe(false);
    expect(() => p.updateDetails('admin-c', { name: 'X programme', durationSemesters: 6, fieldIds: [] })).toThrow('archived');
    p.reopen('admin-c');
    expect(p.status).toBe('draft');
    expect(p.toSnapshot().preparedBy).toBe('admin-c');
  });

  it('lets any admin submit a seeded draft, who then becomes its preparer', () => {
    const p = Program.restore('p', { ...NO_FACTS, ...details, publishStatus: 'draft', preparedBy: null, approvedBy: null, returnReason: null });
    p.submitForReview('admin-a');
    expect(() => p.approve('admin-a')).toThrow('Another admin');
  });

  it('keeps the standard details in a clean form', () => {
    const p = Program.create('p', { ...details, upuCode: ' uc6522001 ', internalCode: ' BELG ', necCode: '0712', studyMode: 'work_based', bumiputeraOnly: true });
    expect(p.toSnapshot()).toMatchObject({ upuCode: 'UC6522001', internalCode: 'BELG', necCode: '0712', studyMode: 'work_based', bumiputeraOnly: true, hasInterview: false });
    expect(() => Program.create('p', { ...details, upuCode: 'BELG' })).toThrow('UC6522001');
    expect(() => Program.create('p', { ...details, necCode: '712' })).toThrow('four digits');
    expect(() => Program.create('p', { ...details, sourceUrl: 'prospektus.pdf' })).toThrow('web link');
  });

  it('keeps the institution and level when other details change', () => {
    const p = draft();
    p.updateDetails('admin-a', { name: 'Diploma Sains Komputer', durationSemesters: 6, fieldIds: [], campus: 'Kampus Induk' });
    expect(p.toSnapshot()).toMatchObject({ institutionId, studyLevel: 'diploma', campus: 'Kampus Induk' });
  });
});
