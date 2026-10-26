CREATE TABLE "catalogue"."institution_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue"."nec_field" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"field_id" uuid
);
--> statement-breakpoint
ALTER TABLE "catalogue"."admission_stat" DROP CONSTRAINT "admission_stat_program_id_program_id_fk";
--> statement-breakpoint
ALTER TABLE "catalogue"."program_pathway" DROP CONSTRAINT "program_pathway_from_program_id_program_id_fk";
--> statement-breakpoint
ALTER TABLE "catalogue"."program_pathway" DROP CONSTRAINT "program_pathway_to_program_id_program_id_fk";
--> statement-breakpoint
ALTER TABLE "catalogue"."program" DROP CONSTRAINT "program_institution_id_institution_id_fk";
--> statement-breakpoint
ALTER TABLE "catalogue"."requirement" DROP CONSTRAINT "requirement_program_id_program_id_fk";
--> statement-breakpoint
ALTER TABLE "catalogue"."institution" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "catalogue"."institution" ADD COLUMN "deletion_requested_by" uuid;--> statement-breakpoint
ALTER TABLE "catalogue"."institution" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "upu_code" text;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "internal_code" text;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "faculty" text;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "nec_code" text;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "study_mode" text;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "campus" text;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "has_interview" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "is_stem" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "is_tvet" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "bumiputera_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "catalogue"."institution_source" ADD CONSTRAINT "institution_source_institution_id_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "catalogue"."institution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."nec_field" ADD CONSTRAINT "nec_field_field_id_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "catalogue"."field"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."admission_stat" ADD CONSTRAINT "admission_stat_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "catalogue"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program_pathway" ADD CONSTRAINT "program_pathway_from_program_id_program_id_fk" FOREIGN KEY ("from_program_id") REFERENCES "catalogue"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program_pathway" ADD CONSTRAINT "program_pathway_to_program_id_program_id_fk" FOREIGN KEY ("to_program_id") REFERENCES "catalogue"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD CONSTRAINT "program_nec_code_nec_field_code_fk" FOREIGN KEY ("nec_code") REFERENCES "catalogue"."nec_field"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD CONSTRAINT "program_institution_id_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "catalogue"."institution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement" ADD CONSTRAINT "requirement_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "catalogue"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD CONSTRAINT "program_upu_code_unique" UNIQUE("upu_code");