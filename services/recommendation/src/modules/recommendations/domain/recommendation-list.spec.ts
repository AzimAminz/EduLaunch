import type { RecommendationItem } from './recommendation-list.js';
import { RecommendationList } from './recommendation-list.js';

const candidate = (programName: string, eligibility: RecommendationItem['eligibility'], score: number): Omit<RecommendationItem, 'isTopMatch'> => ({
  programId: programName,
  programName,
  eligibility,
  score,
  offerChance: 'no_data',
  offerMargin: null,
  isTargetBased: false,
  reasons: [],
  missing: [],
  details: { institutionId: null, studyLevel: 'diploma', durationSemesters: null, entryRoute: 'spm', entryRoutes: [], averageMerit: null, interest: null, continuity: null, met: [], unmet: [], toConfirm: [] },
});

describe('RecommendationList.rank', () => {
  it('puts eligibility before score and marks only an eligible first item as the top match', () => {
    const list = RecommendationList.rank('s', [candidate('A', 'not_yet', 99), candidate('B', 'almost', 90), candidate('C', 'eligible', 10), candidate('D', 'eligible', 50)]);
    expect(list.items.map((i) => i.programName)).toEqual(['D', 'C', 'B', 'A']);
    expect(list.items.map((i) => i.isTopMatch)).toEqual([true, false, false, false]);
  });

  it('keeps not-yet-eligible programmes, and at most the limit for each status', () => {
    const many = Array.from({ length: 5 }, (_, i) => candidate(`N${i}`, 'not_yet', i));
    const list = RecommendationList.rank('s', [...many, candidate('E', 'eligible', 1)], 2);
    expect(list.items.map((i) => i.programName)).toEqual(['E', 'N4', 'N3']);
  });

  it('has no top match when nothing is eligible yet', () => {
    expect(RecommendationList.rank('s', [candidate('B', 'almost', 90)]).items[0]?.isTopMatch).toBe(false);
  });
});
