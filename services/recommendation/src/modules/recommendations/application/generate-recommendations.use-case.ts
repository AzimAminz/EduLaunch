import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '@edulaunch/ddd';
import { EventBus } from '@edulaunch/nest-kit';
import type { StudentSnapshot, StudyLevel } from '@edulaunch/contracts';
import { EligibilityEngine } from '../../eligibility/domain/eligibility-engine.js';
import { Grade } from '../../eligibility/domain/grade.js';
import { MatchScorer, OfferChanceEstimator, interestFit } from '../domain/scoring.js';
import { RecommendationList } from '../domain/recommendation-list.js';
import { CatalogueGateway, ProfileGateway, RecommendationStore } from './ports.js';

/** Which study options to consider for each education level. */
const TARGET_LEVELS: Record<StudentSnapshot['educationLevel'], StudyLevel[]> = {
  form1_3: ['form4_stream'],
  form4_5: ['foundation', 'matriculation', 'diploma', 'certificate', 'skills'],
  after_spm: ['foundation', 'matriculation', 'diploma', 'certificate', 'skills'],
  // Certificate, SVM and SKM holders usually continue to a diploma (or the next skills level).
  after_certificate: ['diploma', 'skills'],
  after_preu: ['degree'],
};

@Injectable()
export class GenerateRecommendations implements UseCase<{ studentId: string }, RecommendationList> {
  private readonly engine = new EligibilityEngine();
  private readonly scorer = new MatchScorer();
  private readonly offers = new OfferChanceEstimator();

  constructor(
    private readonly catalogue: CatalogueGateway,
    private readonly profile: ProfileGateway,
    private readonly store: RecommendationStore,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  async execute({ studentId }: { studentId: string }): Promise<RecommendationList> {
    const snapshot = await this.profile.snapshot(studentId);
    const programmes = await this.catalogue.programmesAt(TARGET_LEVELS[snapshot.educationLevel]);
    const [requirements, subjectNames, fieldWeights] = await Promise.all([
      this.catalogue.publishedRequirements(programmes.map((p) => p.id)),
      this.catalogue.subjectNames(),
      this.catalogue.fieldWeights(),
    ]);
    const ctx = { snapshot, subjectNames };

    const candidates = programmes.flatMap((programme) => {
      const requirement = requirements.find((r) => r.programId === programme.id);
      if (!requirement) return []; // no verified requirement yet: never guess eligibility
      const result = this.engine.check(requirement, ctx);
      const fits = programme.fieldIds.map((f) => interestFit(snapshot.riasec, fieldWeights.get(f) ?? null));
      const fit = fits.length ? Math.max(...fits) : interestFit(snapshot.riasec, null);
      const ruleSubjects = new Set(requirement.rules.map((r) => r.subjectId).filter(Boolean));
      const relevant = snapshot.grades.filter((g) => ruleSubjects.has(g.subjectId));
      const graded = (relevant.length ? relevant : snapshot.grades).map((g) => Grade.of(snapshot.gradeScale, g.grade).normalised);
      const academic = graded.length ? graded.reduce((a, b) => a + b, 0) / graded.length : 0;
      const offer = this.offers.estimate(null, []); // admission statistics are added in Sprint 8
      const score = this.scorer.score({ interestFit: fit, academicStrength: academic, offerChance: offer.band, preferenceSignal: 0 });
      return [{
        programId: programme.id,
        programName: programme.name,
        eligibility: result.status,
        score,
        offerChance: offer.band,
        offerMargin: offer.margin,
        isTargetBased: snapshot.isTargetBased,
        reasons: result.passedReasons.slice(0, 3),
        missing: result.missing,
      }];
    });

    const list = RecommendationList.rank(studentId, candidates);
    await this.store.replaceFor(studentId, [...list.items]);
    await this.events.publish(list.pullEvents());
    return list;
  }
}
