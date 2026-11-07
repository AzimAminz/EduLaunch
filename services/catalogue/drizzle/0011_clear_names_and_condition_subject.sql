-- Names everyone reads the same way, and the subjects a requirement line names in their own table.
ALTER TABLE "catalogue"."requirement" RENAME TO "entry_requirement";--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" RENAME TO "requirement_condition";--> statement-breakpoint
ALTER TYPE "catalogue"."rule_type" RENAME TO "condition_type";--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" RENAME COLUMN "group_no" TO "or_group";--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" RENAME COLUMN "rule_type" TO "condition_type";--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" RENAME COLUMN "evidence_quote" TO "official_text";--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" RENAME COLUMN "related_field_id" TO "field_id";--> statement-breakpoint
ALTER TABLE "catalogue"."program" RENAME COLUMN "upu_code" TO "program_code";--> statement-breakpoint
CREATE TABLE "catalogue"."condition_subject" (
	"condition_id" uuid NOT NULL REFERENCES "catalogue"."requirement_condition"("id") ON DELETE CASCADE,
	"subject_id" uuid NOT NULL REFERENCES "catalogue"."subject"("id"),
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "condition_subject_condition_id_subject_id_pk" PRIMARY KEY("condition_id","subject_id")
);--> statement-breakpoint
CREATE INDEX "condition_subject_subject_idx" ON "catalogue"."condition_subject" USING btree ("subject_id");--> statement-breakpoint
-- The one subject of a grade line, then every subject of a list line in its order.
INSERT INTO "catalogue"."condition_subject" ("condition_id", "subject_id", "position")
SELECT "id", "subject_id", 0 FROM "catalogue"."requirement_condition" WHERE "subject_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "catalogue"."condition_subject" ("condition_id", "subject_id", "position")
SELECT c."id", s."subject_id", s."ord" - 1
FROM "catalogue"."requirement_condition" c, unnest(c."subject_ids") WITH ORDINALITY AS s("subject_id", "ord")
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" DROP COLUMN "subject_id";--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" DROP COLUMN "subject_ids";--> statement-breakpoint
-- Merit formulas are fixed by UPU and kept in code, not in a table nobody edits.
DROP TABLE "catalogue"."merit_formula";
--> statement-breakpoint
-- Constraint names follow the new table and column names.
ALTER TABLE "catalogue"."entry_requirement" RENAME CONSTRAINT "requirement_pkey" TO "entry_requirement_pkey";--> statement-breakpoint
ALTER TABLE "catalogue"."entry_requirement" RENAME CONSTRAINT "requirement_program_id_program_id_fk" TO "entry_requirement_program_id_program_id_fk";--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" RENAME CONSTRAINT "requirement_rule_pkey" TO "requirement_condition_pkey";--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" RENAME CONSTRAINT "requirement_rule_requirement_id_requirement_id_fk" TO "requirement_condition_requirement_id_entry_requirement_id_fk";--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" RENAME CONSTRAINT "requirement_rule_related_field_id_field_id_fk" TO "requirement_condition_field_id_field_id_fk";--> statement-breakpoint
ALTER TABLE "catalogue"."program" RENAME CONSTRAINT "program_upu_code_unique" TO "program_program_code_unique"
;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_condition" RENAME CONSTRAINT "requirement_rule_part_check" TO "requirement_condition_part_check";
