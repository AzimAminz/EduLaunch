import { Injectable } from '@nestjs/common';
import type { UseCase } from '@edulaunch/ddd';
import type { Caller } from '@edulaunch/nest-kit';
import { CatalogueGateway, ProfileGateway } from '../../recommendations/application/ports.js';
import { EligibilityEngine, type Eligibility, type GroupResult } from '../domain/eligibility-engine.js';
import { pickRequirement } from '../domain/entry-route.js';

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
  | { state: 'no_results'; entryRoute: string }
  | { state: 'checked'; entryRoute: string; status: Eligibility; isTargetBased: boolean; groups: GroupResult[] };

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

    const requirement = pickRequirement(requirements, snapshot);
    if (!requirement) return { state: 'no_route', routes: requirements.map((r) => r.entryRoute) };

    // Grade rules need grades; CGPA and MUET rules need those numbers.
    const needsGrades = requirement.rules.some((r) => r.ruleType === 'min_grade' || r.ruleType === 'key_subject' || r.ruleType === 'min_credits');
    const needsNumbers = requirement.rules.some((r) => r.ruleType === 'min_cgpa');
    if ((needsGrades && snapshot.grades.length === 0) || (needsNumbers && snapshot.cgpa === null)) {
      return { state: 'no_results', entryRoute: requirement.entryRoute };
    }

    const result = this.engine.check(requirement, { snapshot, subjectNames });
    return { state: 'checked', entryRoute: requirement.entryRoute, status: result.status, isTargetBased: snapshot.isTargetBased, groups: result.groups };
  }
}

