import { Injectable } from '@nestjs/common';
import type { UseCase } from '@edulaunch/ddd';
import type { Caller } from '@edulaunch/nest-kit';
import { CatalogueGateway, ProfileGateway } from '../../recommendations/application/ports.js';
import { EligibilityEngine, type Eligibility, type GroupResult } from '../domain/eligibility-engine.js';
import { bestOf, requirementsFor } from '../domain/entry-route.js';

/**
 * "Can I enter this programme?" for the signed-in student.
 * - no_requirement: the programme has no verified requirement yet (never guess).
 * - no_route: it has requirements, but none for the student's route (e.g. only "after SPM" for a diploma holder).
 * - no_results: the student has not confirmed the results this route needs.
 * - checked: the outcome, with every rule as data for the web app to explain.
 */
export type EligibilityAnswer =
  | { state: 'no_requirement' }
  | { state: 'no_route'; routes: string[] }
  | { state: 'no_results'; entryRoute: string; missing: 'grades' | 'cgpa' }
  | { state: 'checked'; entryRoute: string; status: Eligibility; isTargetBased: boolean; groups: GroupResult[]; toConfirm: string[] };

@Injectable()
export class CheckEligibility implements UseCase<{ caller: Caller; programId: string }, EligibilityAnswer> {
  private readonly engine = new EligibilityEngine();

  constructor(
    private readonly profile: ProfileGateway,
    private readonly catalogue: CatalogueGateway,
  ) {}

  async execute({ caller, programId }: { caller: Caller; programId: string }): Promise<EligibilityAnswer> {
    const studentId = await this.profile.studentIdFor(caller);
    const [snapshot, requirements, subjectNames] = await Promise.all([this.profile.snapshot(studentId), this.catalogue.publishedRequirements([programId]), this.catalogue.subjectNames()]);
    if (requirements.length === 0) return { state: 'no_requirement' };

    const forRoute = requirementsFor(requirements, snapshot);
    if (forRoute.length === 0) return { state: 'no_route', routes: [...new Set(requirements.map((r) => r.entryRoute))] };

    // Grade rules need grades; CGPA and MUET rules need those numbers.
    const rules = forRoute.flatMap((r) => r.rules);
    const needsGrades = rules.some((r) => r.conditionType === 'min_grade' || r.conditionType === 'key_subject' || r.conditionType === 'min_credits' || r.conditionType === 'subjects_from_list');
    const needsNumbers = rules.some((r) => r.conditionType === 'min_cgpa');
    // Say what is missing: subject grades (SPM after SPM; targets or school results before) or the CGPA.
    if (needsGrades && snapshot.grades.length === 0) return { state: 'no_results', entryRoute: forRoute[0]!.entryRoute, missing: 'grades' };
    if (needsNumbers && snapshot.cgpa === null) return { state: 'no_results', entryRoute: forRoute[0]!.entryRoute, missing: 'cgpa' };

    // One requirement per candidate category of the route: the student is shown the one they come closest to.
    const { requirement, result } = bestOf(forRoute, (r) => this.engine.check(r, { snapshot, subjectNames }))!;
    return { state: 'checked', entryRoute: requirement.entryRoute, status: result.status, isTargetBased: snapshot.isTargetBased, groups: result.groups, toConfirm: result.toConfirm };
  }
}

