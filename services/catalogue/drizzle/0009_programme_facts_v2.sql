ALTER TABLE "catalogue"."program" ADD COLUMN "campuses" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "joint_degree" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "feeder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "careers" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "fees" text;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "note" text;--> statement-breakpoint
-- Campuses were kept as one text joined by "; " (as imported from ePanduan); keep each as its own item.
UPDATE "catalogue"."program" SET "campuses" = regexp_split_to_array(trim("campus"), '\s*;\s*') WHERE "campus" IS NOT NULL AND trim("campus") <> '';--> statement-breakpoint
-- Proposed changes waiting for approval carry the same facts.
UPDATE "catalogue"."program"
SET "pending_changes" = ("pending_changes" - 'campus') || jsonb_build_object(
  'campuses',
  CASE WHEN coalesce(trim("pending_changes"->>'campus'), '') = '' THEN '[]'::jsonb ELSE to_jsonb(regexp_split_to_array(trim("pending_changes"->>'campus'), '\s*;\s*')) END,
  'jointDegree', false, 'feeder', false, 'careers', '[]'::jsonb, 'fees', null, 'note', null
)
WHERE "pending_changes" IS NOT NULL;
