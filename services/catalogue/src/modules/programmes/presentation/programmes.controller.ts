import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentCaller, Public, ZodPipe, type Caller } from '@edulaunch/nest-kit';
import { StudyLevel } from '@edulaunch/contracts';
import { z } from 'zod';
import { SearchProgrammes } from '../application/search-programmes.use-case.js';
import { GetProgramme } from '../application/get-programme.use-case.js';

const SearchQuery = z.object({
  q: z.string().trim().max(100).optional(),
  institutionId: z.uuid().optional(),
  fieldId: z.uuid().optional(),
  studyLevel: StudyLevel.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

@Controller('programmes')
export class ProgrammesController {
  constructor(
    private readonly searchProgrammes: SearchProgrammes,
    private readonly getProgramme: GetProgramme,
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
}
