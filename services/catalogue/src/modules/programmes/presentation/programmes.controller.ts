import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { CurrentCaller, Public, Roles, ZodPipe, type Caller } from '@edulaunch/nest-kit';
import { EntryRoutes, StudyLevel, StudyModes } from '@edulaunch/contracts';
import { z } from 'zod';
import { SearchProgrammes } from '../application/search-programmes.use-case.js';
import { GetProgramme } from '../application/get-programme.use-case.js';
import { CreateProgramme, DeleteProgramme, RecordAverageMerit, RemoveEntryRoute, ReviewProgramme, SetEntryRoutes, UpdateProgramme } from '../application/manage-programme.use-cases.js';

const SearchQuery = z.object({
  q: z.string().trim().max(100).optional(),
  institutionId: z.uuid().optional(),
  fieldId: z.uuid().optional(),
  studyLevel: StudyLevel.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const DetailsBody = z.object({
  name: z.string().max(200),
  durationSemesters: z.number().int().nullable().default(null),
  fieldIds: z.array(z.uuid()).max(10).default([]),
  programCode: z.string().max(30).nullable().optional(),
  internalCode: z.string().max(40).nullable().optional(),
  faculty: z.string().max(200).nullable().optional(),
  necCode: z.string().max(4).nullable().optional(),
  studyMode: z.enum(StudyModes).nullable().optional(),
  campuses: z.array(z.string().max(200)).max(20).optional(),
  hasInterview: z.boolean().optional(),
  isStem: z.boolean().optional(),
  isTvet: z.boolean().optional(),
  bumiputeraOnly: z.boolean().optional(),
  jointDegree: z.boolean().optional(),
  feeder: z.boolean().optional(),
  careers: z.array(z.string().max(200)).max(100).optional(),
  fees: z.string().max(1000).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  sourceUrl: z.string().max(600).nullable().optional(),
});

const CreateBody = DetailsBody.extend({ institutionId: z.uuid().nullable(), studyLevel: StudyLevel });
const UpdateBody = DetailsBody.extend({ institutionId: z.uuid().nullable().optional(), studyLevel: StudyLevel.optional() });

const ReviewBody = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['submit', 'approve', 'withdraw', 'discard', 'archive', 'reopen']) }),
  z.object({ action: z.literal('return'), reason: z.string().min(5).max(1000) }),
]);

const EntryRoutesBody = z.object({
  routes: z.array(z.object({ entryRoute: z.enum(EntryRoutes), sourceCategory: z.string().max(20).nullable() })).max(40),
});

const MeritBody = z.object({ intakeYear: z.number().int().min(2000).max(2100), averageMerit: z.number().min(0).max(100) });

@Controller('programmes')
export class ProgrammesController {
  constructor(
    private readonly searchProgrammes: SearchProgrammes,
    private readonly getProgramme: GetProgramme,
    private readonly createProgramme: CreateProgramme,
    private readonly updateProgramme: UpdateProgramme,
    private readonly reviewProgramme: ReviewProgramme,
    private readonly deleteProgramme: DeleteProgramme,
    private readonly recordAverageMerit: RecordAverageMerit,
    private readonly setEntryRoutes: SetEntryRoutes,
    private readonly removeEntryRoute: RemoveEntryRoute,
  ) {}

  @Public()
  @Get()
  search(@Query(new ZodPipe(SearchQuery)) q: z.infer<typeof SearchQuery>, @CurrentCaller() caller?: Caller) {
    return this.searchProgrammes.execute({
      query: q.q,
      institutionId: q.institutionId,
      fieldId: q.fieldId,
      studyLevel: q.studyLevel,
      page: q.page,
      pageSize: q.pageSize,
      includeDrafts: caller?.role === 'admin',
    });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentCaller() caller?: Caller) {
    return this.getProgramme.execute({ id, includeDrafts: caller?.role === 'admin' });
  }

  /** New programmes start as drafts that students cannot see. */
  @Roles('admin')
  @Post()
  create(@Body(new ZodPipe(CreateBody)) body: z.infer<typeof CreateBody>, @CurrentCaller() caller: Caller) {
    return this.createProgramme.execute({ ...body, adminId: caller.userId });
  }

  /** Edits a draft directly, or a published programme through a pending change. Institution and level apply to drafts only. */
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(UpdateBody)) body: z.infer<typeof UpdateBody>, @CurrentCaller() caller: Caller) {
    return this.updateProgramme.execute({ id, adminId: caller.userId, ...body });
  }

  @Roles('admin')
  @Post(':id/review')
  review(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(ReviewBody)) body: z.infer<typeof ReviewBody>, @CurrentCaller() caller: Caller) {
    return this.reviewProgramme.execute({ id, adminId: caller.userId, superAdmin: caller.superAdmin, ...body });
  }

  /** The entry routes the programme takes candidates from, as the official source (ePanduan) lists them. */
  @Roles('admin')
  @Put(':id/entry-routes')
  @HttpCode(204)
  entryRoutes(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(EntryRoutesBody)) body: z.infer<typeof EntryRoutesBody>) {
    return this.setEntryRoutes.execute({ id, ...body });
  }

  /** Stops taking candidates from one entry route, or only from some of its candidate categories (?categories=stpm:S). */
  @Roles('admin')
  @Delete(':id/entry-routes/:route')
  @HttpCode(204)
  removeRoute(@Param('id', ParseUUIDPipe) id: string, @Param('route') route: string, @Query('categories') categories?: string) {
    return this.removeEntryRoute.execute({ id, entryRoute: route, categories: categories ? categories.split(',').filter(Boolean).slice(0, 20) : undefined });
  }

  /** The average merit of one intake year, as an official source (ePanduan) published it. */
  @Roles('admin')
  @Put(':id/admission-stats')
  @HttpCode(204)
  admissionStats(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(MeritBody)) body: z.infer<typeof MeritBody>) {
    return this.recordAverageMerit.execute({ id, ...body });
  }

  /** Deletes a draft or archived programme, with its requirements. */
  @Roles('admin')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteProgramme.execute({ id });
  }
}
