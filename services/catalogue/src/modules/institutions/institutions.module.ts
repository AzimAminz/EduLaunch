import { Body, Controller, Delete, HttpCode, Injectable, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { DomainError, NotFoundError, type UseCase } from '@edulaunch/ddd';
import { Roles, ZodPipe } from '@edulaunch/nest-kit';
import { InstitutionTypes } from '@edulaunch/contracts';
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

/** Any admin may delete an institution, but only one without programmes, so no programme loses its institution. */
@Injectable()
export class DeleteInstitution implements UseCase<{ id: string }, void> {
  constructor(private readonly institutions: InstitutionRepository) {}

  async execute({ id }: { id: string }) {
    if (!(await this.institutions.findById(id))) throw new NotFoundError('Institution', id);
    const programmes = await this.institutions.countProgrammes(id);
    if (programmes > 0) throw new DomainError('institution_in_use', `The institution still has ${programmes} programme(s); move or remove them first`);
    await this.institutions.delete(id);
  }
}

const InstitutionBody = z.object({
  name: z.string().max(200),
  shortName: z.string().max(40).nullable().default(null),
  type: z.enum(InstitutionTypes),
  websiteUrl: z.string().max(400).nullable().default(null),
});

/** Listing institutions is public (see the reference module); changing them is for admins. */
@Controller('institutions')
export class InstitutionsController {
  constructor(
    private readonly save: SaveInstitution,
    private readonly remove: DeleteInstitution,
  ) {}

  @Roles('admin')
  @Post()
  create(@Body(new ZodPipe(InstitutionBody)) body: z.infer<typeof InstitutionBody>) {
    return this.save.execute(body);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(InstitutionBody)) body: z.infer<typeof InstitutionBody>) {
    return this.save.execute({ id, ...body });
  }

  @Roles('admin')
  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.remove.execute({ id });
  }
}

@Module({
  controllers: [InstitutionsController],
  providers: [{ provide: InstitutionRepository, useClass: DrizzleInstitutionRepository }, SaveInstitution, DeleteInstitution],
})
export class InstitutionsModule {}
