import { Module } from '@nestjs/common';
import { DatabaseModule, HealthModule, MessagingModule } from '@edulaunch/nest-kit';
import * as schema from './infrastructure/db/schema.js';
import { env } from './config.js';
import { SupportModule } from './modules/support/support.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ url: env.DATABASE_URL, schema }),
    MessagingModule.forRoot({ serviceName: 'engagement', url: env.RABBITMQ_URL }),
    HealthModule,
    SupportModule,
    NotificationsModule,
  ],
})
export class AppModule {}
