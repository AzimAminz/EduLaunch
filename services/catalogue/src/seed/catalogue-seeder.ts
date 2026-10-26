import type { Database } from '@edulaunch/nest-kit';
import { eq } from 'drizzle-orm';
import * as schema from '../infrastructure/db/schema.js';
import { SEED_APPROVED_BY, SEED_PREPARED_BY, seedId } from './seed-id.js';
import type { SeedDataset } from './seed-types.js';

export interface SeedSummary {
  institutions: number;
  fields: number;
  necFields: number;
  subjects: number;
  programmes: number;
  requirements: number;
  rules: number;
  pathways: number;
  careers: number;
  activities: number;
  admissionStats: number;
}

const num = (v: number | null | undefined) => (v === null || v === undefined ? null : String(v));

/**
 * Writes a dataset into the catalogue schema in one transaction.
 * Every row gets a fixed ID from its key, so running it again updates instead of duplicating.
 */
export class CatalogueSeeder {
  constructor(private readonly db: Database<typeof schema>) {}

  async run(data: SeedDataset): Promise<SeedSummary> {
    const id = {
      institution: (k: string) => seedId(`institution:${k}`),
      field: (k: string) => seedId(`field:${k}`),
      subject: (k: string) => seedId(`subject:${k}`),
      programme: (k: string) => seedId(`programme:${k}`),
    };

    await this.db.transaction(async (tx) => {
      for (const i of data.institutions) {
        const row = { name: i.name, shortName: i.shortName, type: i.type, websiteUrl: i.websiteUrl };
        await tx.insert(schema.institutions).values({ id: id.institution(i.key), ...row }).onConflictDoUpdate({ target: schema.institutions.id, set: { ...row, updatedAt: new Date() } });
      }
      for (const f of data.fields) {
        const row = { name: f.name, nameEn: f.nameEn, riasecWeights: f.riasec };
        await tx.insert(schema.fields).values({ id: id.field(f.key), ...row }).onConflictDoUpdate({ target: schema.fields.id, set: row });
      }
      for (const n of data.necFields) {
        const row = { name: n.name, fieldId: n.fieldKey ? id.field(n.fieldKey) : null };
        await tx.insert(schema.necFields).values({ code: n.code, ...row }).onConflictDoUpdate({ target: schema.necFields.code, set: row });
      }
      for (const s of data.subjects) {
        const row = { name: s.name, nameEn: s.nameEn, qualification: s.qualification, category: s.category, isMandatory: s.isMandatory, aliases: s.aliases ?? [] };
        await tx.insert(schema.subjects).values({ id: id.subject(s.key), ...row }).onConflictDoUpdate({ target: schema.subjects.id, set: row });
      }
      for (const p of data.programmes) {
        const programId = id.programme(p.key);
        const row = {
          institutionId: p.institutionKey ? id.institution(p.institutionKey) : null,
          name: p.name,
          studyLevel: p.studyLevel,
          durationSemesters: p.durationSemesters,
          publishStatus: 'published' as const,
        };
        await tx.insert(schema.programs).values({ id: programId, ...row }).onConflictDoUpdate({ target: schema.programs.id, set: { ...row, updatedAt: new Date() } });
        await tx.delete(schema.programFields).where(eq(schema.programFields.programId, programId));
        await tx.insert(schema.programFields).values(p.fieldKeys.map((f) => ({ programId, fieldId: id.field(f) })));
      }
      for (const r of data.requirements) {
        const requirementId = seedId(`requirement:${r.programmeKey}:${r.entryRoute}`);
        const row = {
          programId: id.programme(r.programmeKey),
          entryRoute: r.entryRoute,
          versionNo: 1,
          preparedBy: SEED_PREPARED_BY,
          approvedBy: SEED_APPROVED_BY,
          reviewStatus: 'published' as const,
        };
        await tx.insert(schema.requirements).values({ id: requirementId, ...row }).onConflictDoUpdate({ target: schema.requirements.id, set: { ...row, updatedAt: new Date() } });
        await tx.delete(schema.requirementRules).where(eq(schema.requirementRules.requirementId, requirementId));
        await tx.insert(schema.requirementRules).values(
          r.rules.map((rule, i) => ({
            id: seedId(`rule:${r.programmeKey}:${r.entryRoute}:${i}`),
            requirementId,
            groupNo: rule.groupNo,
            ruleType: rule.ruleType,
            subjectId: rule.subjectKey ? id.subject(rule.subjectKey) : null,
            minGrade: rule.minGrade ?? null,
            minValue: num(rule.minValue),
            evidenceQuote: rule.evidenceQuote,
          })),
        );
      }
      for (const w of data.pathways) {
        const row = { conditionText: w.conditionText, minCgpa: num(w.minCgpa) };
        await tx
          .insert(schema.programPathways)
          .values({ fromProgramId: id.programme(w.fromKey), toProgramId: id.programme(w.toKey), ...row })
          .onConflictDoUpdate({ target: [schema.programPathways.fromProgramId, schema.programPathways.toProgramId], set: row });
      }
      for (const c of data.careers) {
        const row = { fieldId: id.field(c.fieldKey), title: c.title, description: c.description, minStudyLevel: c.minStudyLevel };
        await tx.insert(schema.careers).values({ id: seedId(`career:${c.key}`), ...row }).onConflictDoUpdate({ target: schema.careers.id, set: row });
      }
      for (const a of data.activities) {
        const row = { fieldId: id.field(a.fieldKey), title: a.title, type: a.type };
        await tx.insert(schema.activities).values({ id: seedId(`activity:${a.key}`), ...row }).onConflictDoUpdate({ target: schema.activities.id, set: row });
      }
      for (const s of data.admissionStats) {
        const row = {
          programId: id.programme(s.programmeKey),
          intakeYear: s.intakeYear,
          lowestMerit: num(s.lowestMerit),
          averageMerit: num(s.averageMerit),
          applicants: s.applicants,
          places: s.places,
        };
        await tx
          .insert(schema.admissionStats)
          .values({ id: seedId(`stat:${s.programmeKey}:${s.intakeYear}`), ...row })
          .onConflictDoUpdate({ target: schema.admissionStats.id, set: row });
      }
    });

    return {
      institutions: data.institutions.length,
      fields: data.fields.length,
      necFields: data.necFields.length,
      subjects: data.subjects.length,
      programmes: data.programmes.length,
      requirements: data.requirements.length,
      rules: data.requirements.reduce((n, r) => n + r.rules.length, 0),
      pathways: data.pathways.length,
      careers: data.careers.length,
      activities: data.activities.length,
      admissionStats: data.admissionStats.length,
    };
  }
}
