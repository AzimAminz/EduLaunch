import { Body, Controller, Delete, HttpCode, Inject, Injectable, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { NotFoundError, createEvent, type UseCase } from '@edulaunch/ddd';
import { CurrentCaller, EventBus, Roles, ZodPipe, type Caller } from '@edulaunch/nest-kit';
import { Events, InstitutionSourceKinds, InstitutionTypes, MalaysianStates } from '@edulaunch/contracts';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Institution, type InstitutionDetails } from './domain/institution.js';
import { InstitutionRepository } from './domain/institution.repository.js';
import { DrizzleInstitutionRepository } from './infrastructure/drizzle-institution.repository.js';

@Injectable()
export class SaveInstitution implements UseCase<{ id?: string } & InstitutionDetails, { id: string }> {
  constructor(private readonly institutions: InstitutionRepository) {}

  async execute({ id, ...details }: { id?: string } & InstitutionDetails) {
    let institution: Institution;
    if (id) {
      const found = await this.institutions.findById(id);
      if (!found) throw new NotFoundError('Institution', id);
      found.update(details);
      institution = found;
    } else {
      institution = Institution.create(randomUUID(), details);
    }
    await this.institutions.save(institution);
    return { id: institution.id };
  }
}

export type DeletionAction = { action: 'request'; confirm: string } | { action: 'approve' | 'cancel' };

/**
 * Deleting an institution removes all its programmes, requirements, admission figures and sources in one go.
 * Without published programmes it happens at once; otherwise another admin approves first.
 */
@Injectable()
export class DeleteInstitution implements UseCase<{ id: string; adminId: string; superAdmin?: boolean } & DeletionAction, { status: 'deleted' | 'requested' | 'cancelled' }> {
  constructor(
    private readonly institutions: InstitutionRepository,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  async execute(input: { id: string; adminId: string; superAdmin?: boolean } & DeletionAction) {
    const institution = await this.institutions.findById(input.id);
    if (!institution) throw new NotFoundError('Institution', input.id);

    if (input.action === 'cancel') {
      institution.cancelDeletion();
      await this.institutions.save(institution);
      return { status: 'cancelled' as const };
    }
    if (input.action === 'request') {
      const published = await this.institutions.countPublishedProgrammes(input.id);
      if (institution.requestDeletion(input.adminId, input.confirm, published > 0) === 'requested') {
        await this.institutions.save(institution);
        return { status: 'requested' as const };
      }
    } else {
      institution.approveDeletion(input.adminId, input.superAdmin ? 'allowed' : 'forbidden');
    }
    const programIds = await this.institutions.deleteWithProgrammes(input.id);
    await this.events.publish([createEvent(Events.InstitutionDeleted, { institutionId: input.id, programIds })]);
    return { status: 'deleted' as const };
  }
}

@Injectable()
export class ManageInstitutionSources {
  constructor(private readonly institutions: InstitutionRepository) {}

  async add(institutionId: string, source: z.infer<typeof SourceBody>) {
    if (!(await this.institutions.findById(institutionId))) throw new NotFoundError('Institution', institutionId);
    return { id: await this.institutions.addSource(institutionId, { kind: source.kind, url: source.url.trim(), label: source.label?.trim() || null }) };
  }

  async remove(institutionId: string, sourceId: string) {
    if (!(await this.institutions.removeSource(institutionId, sourceId))) throw new NotFoundError('Source', sourceId);
  }
}

const InstitutionBody = z.object({
  name: z.string().max(200),
  shortName: z.string().max(40).nullable().default(null),
  type: z.enum(InstitutionTypes),
  websiteUrl: z.string().max(400).nullable().default(null),
  state: z.enum(MalaysianStates).nullable().optional(),
});

const DeletionBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request'), confirm: z.string().max(200) }),
  z.object({ action: z.enum(['approve', 'cancel']) }),
]);

const SourceBody = z.object({
  kind: z.enum(InstitutionSourceKinds),
  url: z.string().trim().max(600).regex(/^https?:\/\/\S+$/, 'Must be a web link (https://…)'),
  label: z.string().max(120).nullable().optional(),
});

/** Listing institutions is public (see the reference module); changing them is for admins. */
@Controller('institutions')
@Roles('admin')
export class InstitutionsController {
  constructor(
    private readonly save: SaveInstitution,
    private readonly deletion: DeleteInstitution,
    private readonly sources: ManageInstitutionSources,
  ) {}

  @Post()
  create(@Body(new ZodPipe(InstitutionBody)) body: z.infer<typeof InstitutionBody>) {
    return this.save.execute(body);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(InstitutionBody)) body: z.infer<typeof InstitutionBody>) {
    return this.save.execute({ id, ...body });
  }

  /** Request, approve or cancel deleting the institution and everything under it. */
  @Post(':id/deletion')
  delete(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(DeletionBody)) body: z.infer<typeof DeletionBody>, @CurrentCaller() caller: Caller) {
    return this.deletion.execute({ id, adminId: caller.userId, superAdmin: caller.superAdmin, ...body });
  }

  @Post(':id/sources')
  addSource(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(SourceBody)) body: z.infer<typeof SourceBody>) {
    return this.sources.add(id, body);
  }

  @Delete(':id/sources/:sourceId')
  @HttpCode(204)
  removeSource(@Param('id', ParseUUIDPipe) id: string, @Param('sourceId', ParseUUIDPipe) sourceId: string) {
    return this.sources.remove(id, sourceId);
  }
}

@Module({
  controllers: [InstitutionsController],
  providers: [{ provide: InstitutionRepository, useClass: DrizzleInstitutionRepository }, SaveInstitution, DeleteInstitution, ManageInstitutionSources],
})
export class InstitutionsModule {}
