import { Injectable } from '@nestjs/common';
import type { UseCase } from '@edulaunch/ddd';
import type { Caller } from '@edulaunch/nest-kit';
import { DomainError } from '@edulaunch/ddd';
import { GradeScales, type StudentSnapshot } from '@edulaunch/contracts';
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

/**
 * "What if": grades (on the student's main scale) and a CGPA to try instead of the saved ones. Nothing is saved; the
 * same rules run on the student's profile with these in place.
 */
export interface TryOut {
  grades?: Array<{ subjectId: string; grade: string }>;
  cgpa?: number | null;
}

/** The student's snapshot with the tried grades and CGPA in place of the saved ones (other scales untouched). */
export function withTryOut(snapshot: StudentSnapshot, tryOut: TryOut): StudentSnapshot {
  const scale = snapshot.gradeScale;
  const allowed = GradeScales[scale] as readonly string[];
  let grades = snapshot.grades;
  if (tryOut.grades) {
    const tried = tryOut.grades.map((g) => {
      const letter = g.grade.trim().toUpperCase();
      if (!allowed.includes(letter)) throw new DomainError('invalid_grade', `"${g.grade}" is not a ${scale.toUpperCase()} grade`);
      return { subjectId: g.subjectId, grade: letter, scale };
    });
    if (new Set(tried.map((g) => g.subjectId)).size !== tried.length) throw new DomainError('duplicate_subject', 'Each subject can only be tried once');
    // Grades on other scales (STPM, A-Level…) stay as saved; the main scale is replaced by what is tried.
    grades = [...snapshot.grades.filter((g) => (g.scale ?? scale) !== scale), ...tried];
  }
  if (tryOut.cgpa !== undefined && tryOut.cgpa !== null && (tryOut.cgpa < 0 || tryOut.cgpa > 4)) throw new DomainError('invalid_cgpa', 'CGPA is a number from 0.00 to 4.00');
  return { ...snapshot, grades, cgpa: tryOut.cgpa !== undefined ? tryOut.cgpa : snapshot.cgpa };
}

@Injectable()
export class CheckEligibility implements UseCase<{ caller: Caller; programId: string; tryOut?: TryOut }, EligibilityAnswer> {
  private readonly engine = new EligibilityEngine();

  constructor(
    private readonly profile: ProfileGateway,
    private readonly catalogue: CatalogueGateway,
  ) {}

  async execute({ caller, programId, tryOut }: { caller: Caller; programId: string; tryOut?: TryOut }): Promise<EligibilityAnswer> {
    const studentId = await this.profile.studentIdFor(caller);
    const [saved, requirements, subjectNames] = await Promise.all([this.profile.snapshot(studentId), this.catalogue.publishedRequirements([programId]), this.catalogue.subjectNames()]);
    const snapshot = tryOut ? withTryOut(saved, tryOut) : saved;
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

