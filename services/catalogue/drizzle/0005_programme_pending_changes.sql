ALTER TABLE "catalogue"."program" ADD COLUMN "pending_changes" jsonb;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "pending_status" text;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "pending_prepared_by" uuid;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "pending_return_reason" text;