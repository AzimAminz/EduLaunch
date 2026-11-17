import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '@edulaunch/ddd';
import { EventBus } from '@edulaunch/nest-kit';
import type { StudentSnapshot, StudyLevel } from '@edulaunch/contracts';
import { EligibilityEngine } from '../../eligibility/domain/eligibility-engine.js';
import { Grade } from '../../eligibility/domain/grade.js';
import { bestOf, requirementsFor } from '../../eligibility/domain/entry-route.js';
import { MatchScorer, OfferChanceEstimator, fitLevel, interestFit, sharedTypes } from '../domain/scoring.js';
import { programmeProfile, specialisationOf } from '../domain/specialisation.js';
import { FieldRelations, continuityLevel, continuityScore, relativeSimilarity } from '../domain/continuity.js';
import { RecommendationList } from '../domain/recommendation-list.js';
import { CatalogueGateway, ProfileGateway, RecommendationStore, TextEmbedder } from './ports.js';

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
    private readonly embedder: TextEmbedder,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  async execute({ studentId }: { studentId: string }): Promise<RecommendationList> {
    const snapshot = await this.profile.snapshot(studentId);
    const programmes = await this.catalogue.programmesAt(TARGET_LEVELS[snapshot.educationLevel]);
    // What the student studied after SPM: the text model compares its name with every programme's (null without it).
    const prior = snapshot.priorStudy ?? null;
    const priorName = prior?.programmeName ?? prior?.fieldName ?? null;
    const [requirements, subjectNames, fields, similarities] = await Promise.all([
      this.catalogue.publishedRequirements(programmes.map((p) => p.id)),
      this.catalogue.subjectNames(),
      this.catalogue.fields(),
      priorName ? this.embedder.similarity(priorName, programmes.map((p) => p.name)) : null,
    ]);
    const fieldWeights = new Map(fields.map((f) => [f.id, f.riasecWeights]));
    const relations = new FieldRelations(fields);
    const textSimilarity = similarities ? relativeSimilarity(similarities) : null;
    const ctx = { snapshot, subjectNames };

    const candidates = programmes.flatMap((programme, index) => {
      // The requirement for the student's entry route (after SPM, after STPM, after diploma…).
      const best = bestOf(requirementsFor(requirements.filter((r) => r.programId === programme.id), snapshot), (r) => this.engine.check(r, ctx));
      if (!best) return []; // no verified requirement yet: never guess eligibility
      const { requirement, result } = best;
      // The programme's field that suits the student best (a programme can sit in more than one).
      // Matched on the programme's own specialisation where its name tells it (cyber security, multimedia…), on top
      // of its broad field.
      const specialisation = specialisationOf(programme.name);
      const fields = programme.fieldIds.map((id) => {
        const weights = programmeProfile(fieldWeights.get(id) ?? null, specialisation);
        return { id, weights, fit: interestFit(snapshot.riasec, weights) };
      });
      if (!fields.length && specialisation) fields.push({ id: '', weights: specialisation.weights, fit: interestFit(snapshot.riasec, specialisation.weights) });
      const bestField = fields.reduce<(typeof fields)[number] | null>((a, b) => (!a || b.fit > a.fit ? b : a), null);
      const fit = bestField?.fit ?? interestFit(snapshot.riasec, null);
      const ruleSubjects = new Set(requirement.rules.map((r) => r.subjectId).filter(Boolean));
      const relevant = snapshot.grades.filter((g) => ruleSubjects.has(g.subjectId));
      const graded = (relevant.length ? relevant : snapshot.grades).map((g) => Grade.of(g.scale ?? snapshot.gradeScale, g.grade).normalised);
      const academic = graded.length ? graded.reduce((a, b) => a + b, 0) / graded.length : 0;
      const offer = this.offers.estimate(null, []); // admission statistics are added in Sprint 8
      // Continuity: a degree in the diploma's field (or a matriculation stream's) comes first, a related field next.
      const fieldMatch = prior ? relations.match({ fieldId: prior.fieldId, stream: prior.stream }, programme.fieldIds, programme.necCode ?? null) : null;
      const continuity = prior ? continuityScore(fieldMatch, textSimilarity?.[index] ?? null) : null;
      const score = this.scorer.score({ interestFit: fit, academicStrength: academic, continuity, offerChance: offer.band, preferenceSignal: 0 });
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
        details: {
          institutionId: programme.institutionId,
          studyLevel: programme.studyLevel,
          durationSemesters: programme.durationSemesters,
          entryRoute: requirement.entryRoute,
          entryRoutes: programme.entryRoutes,
          averageMerit: programme.averageMerit,
          interest: snapshot.riasec
            ? { fit, level: fitLevel(fit), sharedTypes: sharedTypes(snapshot.riasec, bestField?.weights ?? null), fieldId: bestField?.id || null, specialisation: specialisation?.key ?? null }
            : null,
          continuity:
            prior && continuity !== null
              ? { score: continuity, level: continuityLevel(continuity), fieldMatch, textSimilarity: textSimilarity?.[index] ?? null, qualification: prior.qualification, name: priorName }
              : null,
          met: result.groups.filter((g) => g.passed).flatMap((g) => g.rules.filter((r) => r.passed).slice(0, 1)),
          unmet: result.groups.filter((g) => !g.passed).map((g) => g.rules),
          toConfirm: result.toConfirm,
        },
      }];
    });

    const list = RecommendationList.rank(studentId, candidates);
    await this.store.replaceFor(studentId, [...list.items]);
    await this.events.publish(list.pullEvents());
    return list;
  }
}
