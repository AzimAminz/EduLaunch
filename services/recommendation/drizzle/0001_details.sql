-- Cached lists from before cards had details cannot be shown; they are rebuilt on the student's next visit.
DELETE FROM "recommendation"."recommendation";--> statement-breakpoint
ALTER TABLE "recommendation"."recommendation" ADD COLUMN "details" jsonb NOT NULL;
