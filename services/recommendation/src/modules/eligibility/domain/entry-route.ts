import { routesFor, type PublishedRequirement, type StudentSnapshot } from '@edulaunch/contracts';

// Shared with the web app, so the programme page shows the route the eligibility check uses.
export { routesFor };

/**
 * The programme's requirements for the student's route: one per official candidate category of that route (STPM
 * Sains and STPM Sastera can differ), empty when it publishes none for the route. The first route with any wins.
 */
export function requirementsFor(requirements: PublishedRequirement[], snapshot: Pick<StudentSnapshot, 'educationLevel' | 'higherQualification'>): PublishedRequirement[] {
  for (const route of routesFor(snapshot)) {
    const matches = requirements.filter((r) => r.entryRoute === route);
    if (matches.length) return matches;
  }
  return [];
}

const RANK = { eligible: 0, almost: 1, not_yet: 2 } as const;

/**
 * Checks the student against each category's requirement and keeps the best result: a candidate applies through
 * whichever category they qualify for. Ties keep the requirement with fewer missed rules.
 */
export function bestOf<R extends { status: keyof typeof RANK; missing: unknown[] }>(
  requirements: PublishedRequirement[],
  check: (requirement: PublishedRequirement) => R,
): { requirement: PublishedRequirement; result: R } | null {
  let best: { requirement: PublishedRequirement; result: R } | null = null;
  for (const requirement of requirements) {
    const result = check(requirement);
    if (!best || RANK[result.status] < RANK[best.result.status] || (RANK[result.status] === RANK[best.result.status] && result.missing.length < best.result.missing.length)) {
      best = { requirement, result };
    }
  }
  return best;
}
