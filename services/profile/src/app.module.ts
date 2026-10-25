import { Module } from '@nestjs/common';
import { DatabaseModule, HealthModule, MessagingModule } from '@edulaunch/nest-kit';
import * as schema from './infrastructure/db/schema.js';
import { DrizzleAcademicRecordRepository, DrizzleStudentRepository } from './infrastructure/db/drizzle-repositories.js';
import { env } from './config.js';
import { StudentRepository } from './modules/students/domain/student.repository.js';
import { AcademicRecordRepository } from './modules/academic-records/domain/academic-record.repository.js';
import { GetOrCreateMe, GetStudentSnapshot, UpdateEducationLevel } from './modules/students/application/student.use-cases.js';
import { AcademicRecordService } from './modules/academic-records/application/academic-record.use-cases.js';
import { ProfileController } from './presentation/profile.controller.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ url: env.DATABASE_URL, schema }),
    MessagingModule.forRoot({ serviceName: 'profile', url: env.RABBITMQ_URL }),
    HealthModule,
  ],
  controllers: [ProfileController],
  providers: [
    { provide: StudentRepository, useClass: DrizzleStudentRepository },
    { provide: AcademicRecordRepository, useClass: DrizzleAcademicRecordRepository },
    GetOrCreateMe,
    UpdateEducationLevel,
    GetStudentSnapshot,
    AcademicRecordService,
  ],
})
export class AppModule {}
