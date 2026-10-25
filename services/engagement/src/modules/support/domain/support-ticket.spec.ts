import { DomainError } from '@edulaunch/ddd';
import { SupportTicket } from './support-ticket.js';

const open = () => SupportTicket.open('t1', { userId: 'u1', category: 'wrong_data', programId: 'p1', message: 'Minimum Mathematics grade looks wrong' });

describe('SupportTicket', () => {
  it('needs a programme when reporting wrong data', () => {
    expect(() => SupportTicket.open('t', { userId: 'u', category: 'wrong_data', programId: null, message: 'Something is wrong here' })).toThrow(DomainError);
  });

  it('lets only the claiming admin close it, with a reply', () => {
    const t = open();
    t.claim('aina');
    expect(() => t.close('faiz', 'Fixed')).toThrow(/Another admin/);
    expect(() => t.close('aina', '')).toThrow(DomainError);
    t.close('aina', 'Corrected to B, approved by a second admin');
    expect(t.status).toBe('closed');
  });
});
