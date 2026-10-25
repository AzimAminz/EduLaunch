import { Module } from '@nestjs/common';
import { DatabaseModule, HealthModule, MessagingModule } from '@edulaunch/nest-kit';
import * as schema from './infrastructure/db/schema.js';
import { env } from './config.js';
import { ProgrammesModule } from './modules/programmes/programmes.module.js';
import { RequirementsModule } from './modules/requirements/requirements.module.js';
import { ReferenceModule } from './modules/reference/reference.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ url: env.DATABASE_URL, schema }),
    MessagingModule.forRoot({ serviceName: 'catalogue', url: env.RABBITMQ_URL }),
    HealthModule,
    ProgrammesModule,
    RequirementsModule,
    ReferenceModule,
  ],
})
export class AppModule {}
