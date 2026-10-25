import { Controller, Get, Inject, Injectable, Module } from '@nestjs/common';
import { DRIZZLE, Public, type Database } from '@edulaunch/nest-kit';
import * as schema from '../../infrastructure/db/schema.js';

/** Read-only lookup data (query side). No business rules, so no domain layer. */
@Injectable()
export class ReferenceQueries {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {}

  subjects() {
    return this.db
      .select({ id: schema.subjects.id, name: schema.subjects.name, qualification: schema.subjects.qualification, category: schema.subjects.category, isMandatory: schema.subjects.isMandatory })
      .from(schema.subjects)
      .orderBy(schema.subjects.name);
  }

  fields() {
    return this.db.select().from(schema.fields).orderBy(schema.fields.name);
  }

  institutions() {
    return this.db
      .select({ id: schema.institutions.id, name: schema.institutions.name, shortName: schema.institutions.shortName, type: schema.institutions.type })
      .from(schema.institutions)
      .orderBy(schema.institutions.name);
  }
}

@Controller()
export class ReferenceController {
  constructor(private readonly queries: ReferenceQueries) {}

  @Public()
  @Get('subjects')
  subjects() {
    return this.queries.subjects();
  }

  @Public()
  @Get('fields')
  fields() {
    return this.queries.fields();
  }

  @Public()
  @Get('institutions')
  institutions() {
    return this.queries.institutions();
  }
}

@Module({ controllers: [ReferenceController], providers: [ReferenceQueries] })
export class ReferenceModule {}
