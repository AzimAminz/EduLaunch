import { Module } from '@nestjs/common';
import { DatabaseModule, HealthModule, MessagingModule } from '@edulaunch/nest-kit';
import * as schema from './infrastructure/db/schema.js';
import { env } from './config.js';
import { CatalogueGateway, ProfileGateway, RecommendationStore } from './modules/recommendations/application/ports.js';
import { HttpCatalogueGateway, HttpProfileGateway } from './modules/recommendations/infrastructure/http-gateways.js';
import { DrizzleRecommendationStore } from './modules/recommendations/infrastructure/drizzle-recommendation.store.js';
import { GenerateRecommendations } from './modules/recommendations/application/generate-recommendations.use-case.js';
import { RecomputeOnChange } from './modules/recommendations/application/recompute-on-change.listener.js';
import { RecommendationsController } from './modules/recommendations/presentation/recommendations.controller.js';

@Module({
  imports: [
    DatabaseModule.forRoot({ url: env.DATABASE_URL, schema }),
    MessagingModule.forRoot({ serviceName: 'recommendation', url: env.RABBITMQ_URL }),
    HealthModule,
  ],
  controllers: [RecommendationsController],
  providers: [
    { provide: CatalogueGateway, useFactory: () => new HttpCatalogueGateway(env.CATALOGUE_URL, env.INTERNAL_TOKEN) },
    { provide: ProfileGateway, useFactory: () => new HttpProfileGateway(env.PROFILE_URL, env.INTERNAL_TOKEN) },
    { provide: RecommendationStore, useClass: DrizzleRecommendationStore },
    GenerateRecommendations,
    RecomputeOnChange,
  ],
})
export class AppModule {}
