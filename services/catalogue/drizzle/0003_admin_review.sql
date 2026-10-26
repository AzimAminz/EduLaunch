ALTER TABLE "catalogue"."program" ADD COLUMN "prepared_by" uuid;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "return_reason" text;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement" ADD COLUMN "source_url" text;