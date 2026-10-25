import { Controller, Get, Inject, Injectable, Logger, Module, OnApplicationBootstrap, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentCaller, DRIZZLE, EventBus, InternalHeaders, Roles, type Caller, type Database } from '@edulaunch/nest-kit';
import { Events, type EventPayloads } from '@edulaunch/contracts';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../../infrastructure/db/schema.js';
import { env } from '../../config.js';

const { notifications } = schema;

/** Port: who saved a programme (owned by the profile service). */
export abstract class SaversLookup {
  abstract accountsWhoSaved(programId: string): Promise<string[]>;
}

@Injectable()
class HttpSaversLookup extends SaversLookup {
  async accountsWhoSaved(programId: string): Promise<string[]> {
    const res = await fetch(new URL(`/internal/programmes/${programId}/savers`, env.PROFILE_URL), {
      headers: { [InternalHeaders.token]: env.INTERNAL_TOKEN },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`profile service returned ${res.status}`);
    return z.array(z.uuid()).parse(await res.json());
  }
}

/** Turns catalogue events into notifications for the students they affect. */
@Injectable()
class RequirementChangeNotifier implements OnApplicationBootstrap {
  private readonly logger = new Logger(RequirementChangeNotifier.name);

  constructor(
    @Inject(EventBus) private readonly events: EventBus,
    private readonly savers: SaversLookup,
    @Inject(DRIZZLE) private readonly db: Database<typeof schema>,
  ) {}

  async onApplicationBootstrap() {
    await this.events.subscribe('notify-requirement-change', [Events.RequirementPublished], async (e) => {
      const { programId } = e.payload as EventPayloads[typeof Events.RequirementPublished];
      const userIds = await this.savers.accountsWhoSaved(programId);
      if (!userIds.length) return;
      await this.db.insert(notifications).values(
        userIds.map((userId) => ({ userId, programId, type: 'requirement_changed', message: 'Entry requirements for a programme you saved have changed.' })),
      );
      this.logger.log(`Notified ${userIds.length} students about ${programId}`);
    });
  }
}

@Roles('student')
@Controller('me/notifications')
class NotificationsController {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {}

  @Get()
  list(@CurrentCaller() caller: Caller) {
    return this.db.select().from(notifications).where(eq(notifications.userId, caller.userId)).orderBy(desc(notifications.createdAt)).limit(50);
  }

  @Post(':id/read')
  async markRead(@CurrentCaller() caller: Caller, @Param('id', ParseUUIDPipe) id: string) {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, caller.userId), isNull(notifications.readAt)));
    return { ok: true };
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [{ provide: SaversLookup, useClass: HttpSaversLookup }, RequirementChangeNotifier],
})
export class NotificationsModule {}
