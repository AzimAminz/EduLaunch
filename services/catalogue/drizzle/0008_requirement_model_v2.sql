ALTER TYPE "catalogue"."rule_type" ADD VALUE 'subjects_from_list';--> statement-breakpoint
ALTER TYPE "catalogue"."rule_type" ADD VALUE 'declaration';--> statement-breakpoint
ALTER TYPE "catalogue"."rule_type" ADD VALUE 'note';--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" ADD COLUMN "part" text DEFAULT 'special' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" ADD COLUMN "section" text;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" ADD COLUMN "subject_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" ADD COLUMN "min_count" integer;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement" ADD COLUMN "source_category" text;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" ADD CONSTRAINT "requirement_rule_part_check" CHECK ("part" in ('general', 'special'));
