import { randomUUID } from 'node:crypto';
import { connectTestDatabase } from '@edulaunch/nest-kit/testing';
import { inArray } from 'drizzle-orm';
import * as schema from '../../infrastructure/db/schema.js';
import { SupportTicket } from './domain/support-ticket.js';
import { DrizzleTicketRepository } from './support.module.js';

const { db, close } = connectTestDatabase(schema);
const repo = new DrizzleTicketRepository(db);
const created: string[] = [];

const openTicket = () => {
  const t = SupportTicket.open(randomUUID(), { userId: randomUUID(), category: 'wrong_data', programId: randomUUID(), message: 'The minimum Mathematics grade looks wrong' });
  created.push(t.id);
  return t;
};

afterAll(async () => {
  await db.delete(schema.supportTickets).where(inArray(schema.supportTickets.id, created));
  await close();
});

describe('DrizzleTicketRepository (integration)', () => {
  it('saves a new ticket and reads it back', async () => {
    const t = openTicket();
    await repo.save(t);
    expect((await repo.findById(t.id))?.toSnapshot()).toEqual(t.toSnapshot());
  });

  it('stores the claim, reply and closing time', async () => {
    const t = openTicket();
    await repo.save(t);
    const adminId = randomUUID();
    t.claim(adminId);
    t.close(adminId, 'Corrected to B and approved by a second admin');
    await repo.save(t);

    const found = (await repo.findById(t.id))!.toSnapshot();
    expect(found.status).toBe('closed');
    expect(found.assignedAdminId).toBe(adminId);
    expect(found.adminReply).toBe('Corrected to B and approved by a second admin');
    expect(found.closedAt).toBeInstanceOf(Date);
  });

  it('returns null for an unknown ticket', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });
});
