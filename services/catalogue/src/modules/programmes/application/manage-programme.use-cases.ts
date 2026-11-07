import { Inject, Injectable } from '@nestjs/common';
import { DomainError, NotFoundError, createEvent, type UseCase } from '@edulaunch/ddd';
import { EventBus } from '@edulaunch/nest-kit';
import { Events, isEntryRoute } from '@edulaunch/contracts';
import { randomUUID } from 'node:crypto';
import { Program, type ProgramDetails } from '../domain/program.js';
import { ProgramRepository } from '../domain/program.repository.js';

/** Catches unknown institutions and fields here, so the admin gets a clear message instead of a database error. */
async function checkReferences(programs: ProgramRepository, programId: string | null, d: Partial<ProgramDetails>) {
  if (d.institutionId && !(await programs.institutionExists(d.institutionId))) throw new DomainError('invalid_program', 'Choose an institution from the list');
  const fieldIds = d.fieldIds ?? [];
  const found = await programs.existingFieldIds(fieldIds);
  if (found.length !== new Set(fieldIds).size) throw new DomainError('invalid_program', 'Choose fields from the list');
  if (d.necCode && !(await programs.necCodeExists(d.necCode))) throw new DomainError('invalid_program', 'Choose an NEC field from the list');
  const upu = d.programCode?.trim().toUpperCase();
  if (upu && (await programs.upuCodeTaken(upu, programId))) throw new DomainError('upu_code_taken', `Another programme already uses the code ${upu}`);
}

@Injectable()
export class CreateProgramme implements UseCase<ProgramDetails & { adminId: string }, { id: string }> {
  constructor(private readonly programs: ProgramRepository) {}

  async execute({ adminId, ...details }: ProgramDetails & { adminId: string }) {
    await checkReferences(this.programs, null, details);
    const program = Program.create(randomUUID(), details, adminId);
    await this.programs.save(program);
    return { id: program.id };
  }
}

export type UpdateProgrammeInput = Partial<ProgramDetails> & { id: string; adminId: string };

@Injectable()
export class UpdateProgramme implements UseCase<UpdateProgrammeInput, { status: string }> {
  constructor(private readonly programs: ProgramRepository) {}

  async execute({ id, adminId, ...details }: UpdateProgrammeInput) {
    const program = await this.programs.findById(id);
    if (!program) throw new NotFoundError('Programme', id);
    await checkReferences(this.programs, id, details);
    program.edit(adminId, details);
    await this.programs.save(program);
    return { status: program.status };
  }
}

export type ProgrammeAction = { action: 'submit' | 'approve' | 'withdraw' | 'discard' | 'archive' | 'reopen' } | { action: 'return'; reason: string };

/** Publishing workflow: one entry point so the rules stay in the aggregate. */
@Injectable()
export class ReviewProgramme implements UseCase<{ id: string; adminId: string; superAdmin?: boolean } & ProgrammeAction, { status: string }> {
  constructor(private readonly programs: ProgramRepository) {}

  async execute(input: { id: string; adminId: string; superAdmin?: boolean } & ProgrammeAction) {
    const program = await this.programs.findById(input.id);
    if (!program) throw new NotFoundError('Programme', input.id);
    switch (input.action) {
      case 'submit':
        program.submitForReview(input.adminId);
        break;
      case 'approve':
        program.approve(input.adminId, input.superAdmin ? 'allowed' : 'forbidden');
        break;
      case 'return':
        program.returnToPreparer(input.adminId, input.reason);
        break;
      case 'withdraw':
        program.withdraw();
        break;
      case 'discard':
        program.discardChanges();
        break;
      case 'archive':
        program.archive();
        break;
      case 'reopen':
        program.reopen(input.adminId);
        break;
    }
    await this.programs.save(program);
    return { status: program.status };
  }
}

/** Deletes a draft or archived programme with its requirements. Published ones are archived first. */
/** Records which entry routes a programme takes candidates from, as the official source lists them. */
@Injectable()
export class SetEntryRoutes implements UseCase<{ id: string; routes: Array<{ entryRoute: string; sourceCategory: string | null }> }, void> {
  constructor(private readonly programs: ProgramRepository) {}

  async execute({ id, routes }: { id: string; routes: Array<{ entryRoute: string; sourceCategory: string | null }> }) {
    if (!(await this.programs.findById(id))) throw new NotFoundError('Programme', id);
    const unknown = routes.find((r) => !isEntryRoute(r.entryRoute));
    if (unknown) throw new DomainError('invalid_program', `Unknown entry route ${unknown.entryRoute}`);
    await this.programs.replaceEntryRoutes(id, routes);
  }
}

/** Removes one entry route from a programme (its requirement versions, if any, are kept). */
@Injectable()
export class RemoveEntryRoute implements UseCase<{ id: string; entryRoute: string; categories?: string[] }, void> {
  constructor(private readonly programs: ProgramRepository) {}

  async execute({ id, entryRoute, categories }: { id: string; entryRoute: string; categories?: string[] }) {
    if (!(await this.programs.findById(id))) throw new NotFoundError('Programme', id);
    if (!isEntryRoute(entryRoute)) throw new DomainError('invalid_program', `Unknown entry route ${entryRoute}`);
    await this.programs.removeEntryRoute(id, entryRoute, categories);
  }
}

/** Keeps the average merit an official source published for one intake year (shown later with offer chances). */
@Injectable()
export class RecordAverageMerit implements UseCase<{ id: string; intakeYear: number; averageMerit: number }, void> {
  constructor(private readonly programs: ProgramRepository) {}

  async execute({ id, intakeYear, averageMerit }: { id: string; intakeYear: number; averageMerit: number }) {
    if (!(await this.programs.findById(id))) throw new NotFoundError('Programme', id);
    await this.programs.recordAverageMerit(id, intakeYear, averageMerit);
  }
}

@Injectable()
export class DeleteProgramme implements UseCase<{ id: string }, void> {
  constructor(
    private readonly programs: ProgramRepository,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  async execute({ id }: { id: string }) {
    const program = await this.programs.findById(id);
    if (!program) throw new NotFoundError('Programme', id);
    program.assertDeletable();
    await this.programs.delete(id);
    await this.events.publish([createEvent(Events.ProgrammeDeleted, { programId: id })]);
  }
}
