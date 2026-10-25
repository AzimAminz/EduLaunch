import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus } from '@edulaunch/nest-kit';
import { Events, type EventPayloads } from '@edulaunch/contracts';
import { GenerateRecommendations } from './generate-recommendations.use-case.js';
import { RecommendationStore } from './ports.js';

/** Keeps cached recommendations fresh: results, interests or requirements changed → recompute. */
@Injectable()
export class RecomputeOnChange implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecomputeOnChange.name);

  constructor(
    @Inject(EventBus) private readonly events: EventBus,
    private readonly generate: GenerateRecommendations,
    private readonly store: RecommendationStore,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.events.subscribe('student-changed', [Events.AcademicRecordConfirmed, Events.AssessmentCompleted], async (e) => {
      const { studentId } = e.payload as EventPayloads[typeof Events.AcademicRecordConfirmed];
      await this.generate.execute({ studentId });
    });

    await this.events.subscribe('requirement-published', [Events.RequirementPublished], async (e) => {
      const { programId } = e.payload as EventPayloads[typeof Events.RequirementPublished];
      const affected = await this.store.studentsWithProgramme(programId);
      this.logger.log(`Requirement changed for ${programId}; recomputing ${affected.length} students`);
      for (const studentId of affected) await this.generate.execute({ studentId });
    });
  }
}
