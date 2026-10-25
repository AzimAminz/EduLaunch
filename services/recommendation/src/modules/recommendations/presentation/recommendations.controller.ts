import { Controller, Get, Post } from '@nestjs/common';
import { CurrentCaller, Roles, type Caller } from '@edulaunch/nest-kit';
import { GenerateRecommendations } from '../application/generate-recommendations.use-case.js';
import { ProfileGateway, RecommendationStore } from '../application/ports.js';

@Roles('student')
@Controller('me/recommendations')
export class RecommendationsController {
  constructor(
    private readonly profile: ProfileGateway,
    private readonly store: RecommendationStore,
    private readonly generate: GenerateRecommendations,
  ) {}

  @Get()
  async list(@CurrentCaller() caller: Caller) {
    const studentId = await this.profile.studentIdFor(caller);
    const items = await this.store.listFor(studentId);
    return { items, needsAlternativePathways: items.filter((i) => i.eligibility === 'eligible').length < 5 };
  }

  @Post('refresh')
  async refresh(@CurrentCaller() caller: Caller) {
    const studentId = await this.profile.studentIdFor(caller);
    const list = await this.generate.execute({ studentId });
    return { items: list.items, needsAlternativePathways: list.needsAlternativePathways };
  }
}
