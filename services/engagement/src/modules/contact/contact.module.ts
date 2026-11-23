import { Body, Controller, Get, HttpCode, Inject, Module, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { DomainError, NotFoundError } from '@edulaunch/ddd';
import { CurrentCaller, DRIZZLE, Public, Roles, ZodPipe, type Caller, type Database } from '@edulaunch/nest-kit';
import { and, count, desc, eq, gte, isNotNull, isNull, lt } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../../infrastructure/db/schema.js';
import { KEEP_HANDLED_DAYS, judgeContact } from './contact-rules.js';

const { contactMessages } = schema;
const DAY = 24 * 3600 * 1000;

const SendBody = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200).transform((e) => e.toLowerCase()),
  category: z.enum(['usage', 'data', 'privacy', 'other']),
  message: z.string().trim().min(10).max(2000),
  // The hidden field ("website"): empty for people.
  website: z.string().max(200).default(''),
});

/** The public contact form: anyone may send; admins read the messages and mark them handled after replying. */
@Controller('contact')
class ContactController {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {}

  @Public()
  @Post()
  @HttpCode(202)
  async send(@Body(new ZodPipe(SendBody)) body: z.infer<typeof SendBody>) {
    const since = new Date(Date.now() - DAY);
    const [[mine], [all]] = await Promise.all([
      this.db.select({ n: count() }).from(contactMessages).where(and(eq(contactMessages.email, body.email), gte(contactMessages.createdAt, since))),
      this.db.select({ n: count() }).from(contactMessages).where(gte(contactMessages.createdAt, since)),
    ]);
    const verdict = judgeContact({ trap: body.website, fromThisEmailToday: Number(mine?.n ?? 0), allToday: Number(all?.n ?? 0) });
    if (verdict === 'too_many_from_you') throw new DomainError('too_many_messages', 'You have sent several messages today; we will reply to those first');
    if (verdict === 'too_many_today') throw new DomainError('contact_busy', 'The contact form is busy today; please try again tomorrow');
    if (verdict === 'accept') {
      await this.db.insert(contactMessages).values({ name: body.name, email: body.email, category: body.category, message: body.message });
    }
    return { received: true };
  }

  /** New messages oldest first, then those handled in the last 30 days. Old handled ones are deleted here. */
  @Roles('admin')
  @Get()
  async list() {
    await this.db.delete(contactMessages).where(and(isNotNull(contactMessages.handledAt), lt(contactMessages.handledAt, new Date(Date.now() - KEEP_HANDLED_DAYS * DAY))));
    const [open, handled] = await Promise.all([
      this.db.select().from(contactMessages).where(isNull(contactMessages.handledAt)).orderBy(contactMessages.createdAt).limit(200),
      this.db.select().from(contactMessages).where(gte(contactMessages.handledAt, new Date(Date.now() - 30 * DAY))).orderBy(desc(contactMessages.handledAt)).limit(100),
    ]);
    return { open, handled };
  }

  @Roles('admin')
  @Post(':id/handled')
  async handled(@Param('id', ParseUUIDPipe) id: string, @CurrentCaller() caller: Caller) {
    const [row] = await this.db
      .update(contactMessages)
      .set({ handledBy: caller.userId, handledAt: new Date() })
      .where(and(eq(contactMessages.id, id), isNull(contactMessages.handledAt)))
      .returning();
    if (!row) {
      const [exists] = await this.db.select({ id: contactMessages.id }).from(contactMessages).where(eq(contactMessages.id, id)).limit(1);
      if (!exists) throw new NotFoundError('Contact message', id);
      throw new DomainError('already_handled', 'Another admin has already handled this message');
    }
    return row;
  }
}

@Module({ controllers: [ContactController] })
export class ContactModule {}
