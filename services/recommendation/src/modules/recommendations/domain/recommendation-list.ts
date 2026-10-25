import { AggregateRoot, createEvent } from '@edulaunch/ddd';
import { Events } from '@edulaunch/contracts';
import type { Eligibility } from '../../eligibility/domain/eligibility-engine.js';
import type { OfferChance } from './scoring.js';

export interface RecommendationItem {
  programId: string;
  programName: string;
  eligibility: Eligibility;
  score: number;
  offerChance: OfferChance;
  offerMargin: number | null;
  isTopMatch: boolean;
  isTargetBased: boolean;
  reasons: string[];
  missing: string[];
}

/** The ranked list for one student. Only eligible or almost-eligible programmes are kept. */
export class RecommendationList extends AggregateRoot<string, { items: RecommendationItem[] }> {
  static rank(studentId: string, candidates: Omit<RecommendationItem, 'isTopMatch'>[], limit = 20): RecommendationList {
    const order: Record<Eligibility, number> = { eligible: 0, almost: 1, not_yet: 2 };
    const items = candidates
      .filter((c) => c.eligibility !== 'not_yet')
      .sort((a, b) => order[a.eligibility] - order[b.eligibility] || b.score - a.score)
      .slice(0, limit)
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
