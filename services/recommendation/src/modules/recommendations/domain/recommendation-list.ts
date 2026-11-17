import { AggregateRoot, createEvent } from '@edulaunch/ddd';
import { Events } from '@edulaunch/contracts';
import type { Eligibility } from '../../eligibility/domain/eligibility-engine.js';
import type { RuleDetail } from '../../eligibility/domain/rules.js';
import type { FieldMatch } from './continuity.js';
import type { FitLevel, OfferChance, RiasecType } from './scoring.js';

/** What a recommendation card shows, kept as data so the web app words it in the student's language. */
export interface RecommendationDetails {
  institutionId: string | null;
  studyLevel: string;
  durationSemesters: number | null;
  /** The entry route the student was checked on (spm, stpm, diploma…). */
  entryRoute: string;
  /** Every entry route the programme takes, and its newest average merit: the web app compares the student's merit. */
  entryRoutes: string[];
  averageMerit: { intakeYear: number; value: number } | null;
  /** Null when the student has not taken the interest test. */
  interest: { fit: number; level: FitLevel; sharedTypes: RiasecType[]; fieldId: string | null; specialisation?: string | null } | null;
  /**
   * How the programme follows on from what the student studied after SPM (a diploma's field, a matriculation
   * stream, the programme's name). Null when nothing is known about their earlier study.
   */
  continuity: {
    score: number;
    level: FitLevel;
    fieldMatch: FieldMatch | null;
    /** The programme name's closeness to the earlier programme's, relative to the other candidates; null without a text model. */
    textSimilarity: number | null;
    qualification: string;
    /** The earlier programme (or field) as the student named it, for "continues your Diploma Sains Komputer". */
    name: string | null;
  } | null;
  /** Requirements met: the rule that met each group. */
  met: RuleDetail[];
  /** Requirements not met yet: per group, its rules (more than one when any of them would do). */
  unmet: RuleDetail[][];
  /** Conditions the student confirms or the university checks (interview, health…), as officially written. */
  toConfirm: string[];
}

export interface RecommendationItem {
  programId: string;
  programName: string;
  eligibility: Eligibility;
  score: number;
  offerChance: OfferChance;
  offerMargin: number | null;
  isTopMatch: boolean;
  isTargetBased: boolean;
  /** Plain English, kept for older readers of the list; the web app uses `details`. */
  reasons: string[];
  missing: string[];
  details: RecommendationDetails;
}

/**
 * Raised whenever the scoring changes (weights, new signals), so lists kept from before are worked out again on the
 * student's next visit instead of showing stale ranks. 2: earlier study (field continuity, programme-name similarity). 3: interest profiles per specialisation. 4: related fields by NEC code.
 */
export const SCORING_VERSION = 4;

/** At most this many programmes are kept for each eligibility status. */
export const PER_STATUS_LIMIT = 30;

/**
 * The ranked list for one student: eligible first, then almost eligible, then not yet eligible (so a student can see
 * what is missing), each by score. Eligibility always comes before fit: a better fit never lifts a programme above one
 * the student can enter.
 */
export class RecommendationList extends AggregateRoot<string, { items: RecommendationItem[] }> {
  static rank(studentId: string, candidates: Omit<RecommendationItem, 'isTopMatch'>[], limit = PER_STATUS_LIMIT): RecommendationList {
    const order: Record<Eligibility, number> = { eligible: 0, almost: 1, not_yet: 2 };
    const sorted = [...candidates].sort((a, b) => order[a.eligibility] - order[b.eligibility] || b.score - a.score || a.programName.localeCompare(b.programName));
    const kept = new Map<Eligibility, number>();
    const items = sorted
      .filter((c) => {
        const n = kept.get(c.eligibility) ?? 0;
        kept.set(c.eligibility, n + 1);
        return n < limit;
      })
      .map((c, i) => ({ ...c, isTopMatch: i === 0 && c.eligibility === 'eligible' }));
    const list = new RecommendationList(studentId, { items });
    list.record(createEvent(Events.RecommendationsGenerated, { studentId, count: items.length, topProgramId: items.find((i) => i.isTopMatch)?.programId ?? null }));
    return list;
  }

  get items(): readonly RecommendationItem[] {
    return this.props.items;
  }

  /** Fewer than five eligible programmes switches the UI to alternative pathways. */
  get needsAlternativePathways(): boolean {
    return this.props.items.filter((i) => i.eligibility === 'eligible').length < 5;
  }
}
