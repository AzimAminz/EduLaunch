import { NO_FACTS, Program, type ProgramDetails } from './program.js';

const institutionId = '00000000-0000-4000-8000-000000000001';
const otherInstitution = '00000000-0000-4000-8000-000000000002';
const details: ProgramDetails = { institutionId, name: 'Diploma Sains Komputer', studyLevel: 'diploma', durationSemesters: 6, fieldIds: [] };
const draft = (by = 'admin-a') => Program.create('p1', details, by);
const published = () => Program.restore('p', { ...NO_FACTS, ...details, publishStatus: 'published', preparedBy: null, approvedBy: null, returnReason: null, pending: null });

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

  it('keeps the standard details in a clean form', () => {
    const p = Program.create('p', { ...details, upuCode: ' uc6522001 ', internalCode: ' BELG ', necCode: '0712', studyMode: 'work_based', bumiputeraOnly: true });
    expect(p.toSnapshot()).toMatchObject({ upuCode: 'UC6522001', internalCode: 'BELG', necCode: '0712', studyMode: 'work_based', bumiputeraOnly: true, hasInterview: false });
    expect(() => Program.create('p', { ...details, upuCode: 'BELG' })).toThrow('UC6522001');
    expect(() => Program.create('p', { ...details, necCode: '712' })).toThrow('four digits');
    expect(() => Program.create('p', { ...details, sourceUrl: 'prospektus.pdf' })).toThrow('web link');
  });

  describe('a new programme', () => {
    it('is published only after another admin approves it', () => {
      const p = draft();
      p.submitForReview('admin-a');
      expect(p.status).toBe('in_review');
      expect(() => p.approve('admin-a')).toThrow('Another admin');
      p.approve('admin-b');
      expect(p.status).toBe('published');
      expect(p.toSnapshot().approvedBy).toBe('admin-b');
    });

    it('can be edited by any admin, who then becomes its preparer and cannot approve it', () => {
      const p = draft('admin-a');
      p.edit('admin-b', { name: 'Diploma Sains Komputer (Rangkaian)' });
      expect(p.toSnapshot()).toMatchObject({ name: 'Diploma Sains Komputer (Rangkaian)', preparedBy: 'admin-b' });
      p.submitForReview('admin-b');
      expect(() => p.approve('admin-b')).toThrow('Another admin');
      p.approve('admin-a');
      expect(p.status).toBe('published');
    });

    it('can move to another institution or level until it is first published', () => {
      const p = draft();
      p.edit('admin-a', { institutionId: otherInstitution, studyLevel: 'degree', durationSemesters: 8 });
      expect(p.toSnapshot()).toMatchObject({ institutionId: otherInstitution, studyLevel: 'degree', durationSemesters: 8 });
    });

    it('is locked while in review, and can be withdrawn to edit again', () => {
      const p = draft();
      p.submitForReview('admin-a');
      expect(() => p.edit('admin-a', { name: 'Diploma Baharu' })).toThrow('withdraw it first');
      p.withdraw();
      expect(p.status).toBe('draft');
      p.edit('admin-a', { name: 'Diploma Baharu' });
      expect(p.name).toBe('Diploma Baharu');
    });

    it('goes back with a reason, and the reason clears when it is sent again', () => {
      const p = draft();
      p.submitForReview('admin-a');
      expect(() => p.returnToPreparer('admin-b', 'no')).toThrow('Explain');
      p.returnToPreparer('admin-b', 'Tempoh pengajian salah');
      expect(p.toSnapshot()).toMatchObject({ publishStatus: 'returned', returnReason: 'Tempoh pengajian salah' });
      p.edit('admin-a', { durationSemesters: 5 });
      p.submitForReview('admin-a');
      expect(p.toSnapshot().returnReason).toBeNull();
    });
  });

  describe('a published programme', () => {
    it('keeps what students see until another admin approves the change', () => {
      const p = published();
      p.edit('admin-c', { name: 'Diploma Sains Komputer (Rangkaian)', campus: 'Kampus Induk', institutionId: otherInstitution });
      expect(p.name).toBe('Diploma Sains Komputer');
      expect(p.pending).toMatchObject({ status: 'draft', preparedBy: 'admin-c' });
      // Institution and level stay as published.
      expect(p.pending!.details).toMatchObject({ name: 'Diploma Sains Komputer (Rangkaian)', campus: 'Kampus Induk', institutionId });
      p.submitForReview('admin-c');
      expect(() => p.approve('admin-c')).toThrow('Another admin');
      p.approve('admin-d');
      expect(p.toSnapshot()).toMatchObject({ name: 'Diploma Sains Komputer (Rangkaian)', campus: 'Kampus Induk', publishStatus: 'published', pending: null, approvedBy: 'admin-d' });
    });

    it('builds one change from several edits, and can drop it', () => {
      const p = published();
      p.edit('admin-c', { campus: 'Kampus Induk' });
      p.edit('admin-d', { durationSemesters: 5 });
      expect(p.pending!.details).toMatchObject({ campus: 'Kampus Induk', durationSemesters: 5 });
      expect(p.pending!.preparedBy).toBe('admin-d');
      p.discardChanges();
      expect(p.pending).toBeNull();
      expect(p.toSnapshot().durationSemesters).toBe(6);
    });

    it('returns a change with a reason, or withdraws it to edit', () => {
      const p = published();
      p.edit('admin-c', { campus: 'Kampus Induk' });
      p.submitForReview('admin-c');
      expect(() => p.edit('admin-c', { campus: 'X' })).toThrow('withdraw them first');
      expect(() => p.discardChanges()).toThrow('Withdraw');
      p.returnToPreparer('admin-d', 'Kampus salah dieja');
      expect(p.pending).toMatchObject({ status: 'returned', returnReason: 'Kampus salah dieja' });
      p.edit('admin-c', { campus: 'Kampus Induk Durian Tunggal' });
      p.submitForReview('admin-c');
      p.withdraw();
      expect(p.pending!.status).toBe('draft');
    });

    it('is archived and reopened as a draft; archiving drops an unsent change', () => {
      const p = published();
      p.edit('admin-c', { campus: 'Kampus Induk' });
      p.archive();
      expect(p.toSnapshot()).toMatchObject({ publishStatus: 'archived', pending: null });
      expect(() => p.edit('admin-c', { name: 'X programme' })).toThrow('Reopen');
      p.reopen('admin-c');
      expect(p.toSnapshot()).toMatchObject({ publishStatus: 'draft', preparedBy: 'admin-c' });
    });

    it('has nothing to send or approve without a change', () => {
      const p = published();
      expect(() => p.submitForReview('admin-c')).toThrow('nothing to send');
      expect(() => p.approve('admin-c')).toThrow('not waiting');
    });
  });
});
