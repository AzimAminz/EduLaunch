import { Controller, Get, Post } from '@nestjs/common';
import { CurrentCaller, Roles, type Caller } from '@edulaunch/nest-kit';
import { GenerateRecommendations } from '../application/generate-recommendations.use-case.js';
import { ProfileGateway, RecommendationStore } from '../application/ports.js';
import { SCORING_VERSION, type RecommendationItem } from '../domain/recommendation-list.js';

const answer = (items: readonly RecommendationItem[], generatedAt: Date | null) => ({
  items,
  generatedAt,
  needsAlternativePathways: items.filter((i) => i.eligibility === 'eligible').length < 5,
});

@Roles('student')
@Controller('me/recommendations')
export class RecommendationsController {
  constructor(
    private readonly profile: ProfileGateway,
    private readonly store: RecommendationStore,
    private readonly generate: GenerateRecommendations,
  ) {}

  /**
   * The kept list; worked out on the spot the first time, or again when it predates the current scoring (results,
   * interests and requirements keep it fresh in between).
   */
  @Get()
  async list(@CurrentCaller() caller: Caller) {
    const studentId = await this.profile.studentIdFor(caller);
    const status = await this.store.status(studentId);
    if (status && status.scoringVersion === SCORING_VERSION) return answer(await this.store.listFor(studentId), status.generatedAt);
    const list = await this.generate.execute({ studentId });
    return answer(list.items, list.items.length ? new Date() : null);
  }

  @Post('refresh')
  async refresh(@CurrentCaller() caller: Caller) {
    const studentId = await this.profile.studentIdFor(caller);
    const list = await this.generate.execute({ studentId });
    return answer(list.items, new Date());
  }
}
