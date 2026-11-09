/**
 * Events published on the `edulaunch.events` topic exchange.
 * The routing key is the event name: `<service>.<entity>.<past-tense verb>`.
 */
export const Events = {
  RequirementPublished: 'catalogue.requirement.published',
  PathwayPublished: 'catalogue.pathway.published',
  InstitutionDeleted: 'catalogue.institution.deleted',
  ProgrammeDeleted: 'catalogue.programme.deleted',
  AcademicRecordConfirmed: 'profile.academic-record.confirmed',
  AssessmentCompleted: 'profile.assessment.completed',
  /** A student deleted their account: every service removes what it keeps about them. */
  AccountDeleted: 'profile.account.deleted',
  RecommendationsGenerated: 'recommendation.list.generated',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

export interface EventPayloads {
  [Events.RequirementPublished]: { programId: string; requirementId: string; versionNo: number };
  [Events.PathwayPublished]: { fromProgramId: string; toProgramId: string };
  /** The institution and every programme it had are gone; other services drop what points to them. */
  [Events.InstitutionDeleted]: { institutionId: string; programIds: string[] };
  /** A draft or archived programme was deleted with its requirements; other services drop what points to it. */
  [Events.ProgrammeDeleted]: { programId: string };
  [Events.AcademicRecordConfirmed]: { studentId: string; recordId: string };
  /** The student finished the interest test; the result is on the student. */
  [Events.AssessmentCompleted]: { studentId: string };
  [Events.AccountDeleted]: { accountId: string; studentId: string };
  [Events.RecommendationsGenerated]: { studentId: string; count: number; topProgramId: string | null };
}
