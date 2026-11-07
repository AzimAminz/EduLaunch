DROP TABLE "profile"."assessment" CASCADE;--> statement-breakpoint
DROP TABLE "profile"."roadmap_step" CASCADE;--> statement-breakpoint
DROP TABLE "profile"."roadmap" CASCADE;--> statement-breakpoint
-- Kept with its values, under a clearer name.
ALTER TABLE "profile"."record_subject" RENAME COLUMN "read_confidence" TO "ocr_confidence";