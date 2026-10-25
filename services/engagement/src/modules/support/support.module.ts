import { Body, Controller, Get, Inject, Injectable, Module, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { NotFoundError } from '@edulaunch/ddd';
import { CurrentCaller, DRIZZLE, Roles, ZodPipe, type Caller, type Database } from '@edulaunch/nest-kit';
import { desc, eq, ne } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import * as schema from '../../infrastructure/db/schema.js';
import { SupportTicket } from './domain/support-ticket.js';

const { supportTickets } = schema;

export abstract class TicketRepository {
  abstract findById(id: string): Promise<SupportTicket | null>;
  abstract save(ticket: SupportTicket): Promise<void>;
}

@Injectable()
class DrizzleTicketRepository extends TicketRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {
    super();
  }

  async findById(id: string) {
    const [r] = await this.db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
    return r
      ? SupportTicket.restore(r.id, { userId: r.userId, category: r.category, programId: r.programId, message: r.message, assignedAdminId: r.assignedAdminId, adminReply: r.adminReply, status: r.status, closedAt: r.closedAt })
      : null;
  }

  async save(ticket: SupportTicket) {
    const { id, ...s } = ticket.toSnapshot();
    await this.db.insert(supportTickets).values({ id, ...s }).onConflictDoUpdate({ target: supportTickets.id, set: s });
  }
}

const OpenBody = z.object({ category: z.enum(['wrong_data', 'account', 'other']), programId: z.uuid().nullable().default(null), message: z.string().max(2000) });
const CloseBody = z.object({ reply: z.string().max(2000) });

@Controller('tickets')
class SupportController {
  constructor(
    private readonly tickets: TicketRepository,
    @Inject(DRIZZLE) private readonly db: Database<typeof schema>,
  ) {}

  @Roles('student')
  @Post()
  async open(@CurrentCaller() caller: Caller, @Body(new ZodPipe(OpenBody)) body: z.infer<typeof OpenBody>) {
    const ticket = SupportTicket.open(randomUUID(), { userId: caller.userId, ...body });
    await this.tickets.save(ticket);
    return ticket.toSnapshot();
  }

  @Roles('student')
  @Get('mine')
  mine(@CurrentCaller() caller: Caller) {
    return this.db.select().from(supportTickets).where(eq(supportTickets.userId, caller.userId)).orderBy(desc(supportTickets.createdAt));
  }

  @Roles('admin')
  @Get('queue')
  queue() {
    return this.db.select().from(supportTickets).where(ne(supportTickets.status, 'closed')).orderBy(supportTickets.createdAt);
  }

  @Roles('admin')
  @Post(':id/claim')
  async claim(@Param('id', ParseUUIDPipe) id: string, @CurrentCaller() caller: Caller) {
    const t = await this.load(id);
    t.claim(caller.userId);
    await this.tickets.save(t);
    return t.toSnapshot();
  }

  @Roles('admin')
  @Post(':id/close')
  async close(@Param('id', ParseUUIDPipe) id: string, @CurrentCaller() caller: Caller, @Body(new ZodPipe(CloseBody)) body: z.infer<typeof CloseBody>) {
    const t = await this.load(id);
    t.close(caller.userId, body.reply);
    await this.tickets.save(t);
    return t.toSnapshot();
  }

  private async load(id: string) {
    const t = await this.tickets.findById(id);
    if (!t) throw new NotFoundError('Ticket', id);
    return t;
  }
}

@Module({ controllers: [SupportController], providers: [{ provide: TicketRepository, useClass: DrizzleTicketRepository }] })
export class SupportModule {}
