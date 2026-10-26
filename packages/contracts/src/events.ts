/**
 * Events published on the `edulaunch.events` topic exchange.
 * The routing key is the event name: `<service>.<entity>.<past-tense verb>`.
 */
export const Events = {
  RequirementPublished: 'catalogue.requirement.published',
  PathwayPublished: 'catalogue.pathway.published',
  InstitutionDeleted: 'catalogue.institution.deleted',
  AcademicRecordConfirmed: 'profile.academic-record.confirmed',
  AssessmentCompleted: 'profile.assessment.completed',
  RecommendationsGenerated: 'recommendation.list.generated',
  ContentDraftCreated: 'content.draft.created',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

export interface EventPayloads {
  [Events.RequirementPublished]: { programId: string; requirementId: string; versionNo: number };
  [Events.PathwayPublished]: { fromProgramId: string; toProgramId: string };
  /** The institution and every programme it had are gone; other services drop what points to them. */
  [Events.InstitutionDeleted]: { institutionId: string; programIds: string[] };
  [Events.AcademicRecordConfirmed]: { studentId: string; recordId: string };
  [Events.AssessmentCompleted]: { studentId: string; assessmentId: string };
  [Events.RecommendationsGenerated]: { studentId: string; count: number; topProgramId: string | null };
  [Events.ContentDraftCreated]: { sourceId: string; draftId: string; changedFields: number };
}
