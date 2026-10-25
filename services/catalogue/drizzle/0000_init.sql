CREATE SCHEMA IF NOT EXISTS "catalogue";
--> statement-breakpoint
CREATE TYPE "catalogue"."review_status" AS ENUM('draft', 'in_review', 'returned', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "catalogue"."rule_type" AS ENUM('min_grade', 'min_credits', 'min_cgpa', 'min_muet', 'key_subject');--> statement-breakpoint
CREATE TYPE "catalogue"."study_level" AS ENUM('form4_stream', 'certificate', 'skills', 'foundation', 'matriculation', 'stpm', 'diploma', 'degree');--> statement-breakpoint
CREATE TABLE "catalogue"."activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"activity_title" text NOT NULL,
	"activity_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue"."admission_stat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"source_id" uuid,
	"intake_year" integer NOT NULL,
	"lowest_merit" numeric(6, 2),
	"average_merit" numeric(6, 2),
	"applicants" integer,
	"places" integer
);
--> statement-breakpoint
CREATE TABLE "catalogue"."career" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"source_id" uuid,
	"career_title" text NOT NULL,
	"description" text,
	"min_study_level" "catalogue"."study_level" NOT NULL,
	"outlook_note" text
);
--> statement-breakpoint
CREATE TABLE "catalogue"."field" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_field_id" uuid,
	"field_name" text NOT NULL,
	"riasec_weights" jsonb
);
--> statement-breakpoint
CREATE TABLE "catalogue"."institution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_name" text NOT NULL,
	"short_name" text,
	"institution_type" text NOT NULL,
	"website_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue"."merit_formula" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approved_by" uuid,
	"entry_route" text NOT NULL,
	"academic_weight" numeric(5, 2) NOT NULL,
	"cocurricular_weight" numeric(5, 2) NOT NULL,
	"version_no" integer NOT NULL,
	"review_status" "catalogue"."review_status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue"."program_field" (
	"program_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	CONSTRAINT "program_field_program_id_field_id_pk" PRIMARY KEY("program_id","field_id")
);
--> statement-breakpoint
CREATE TABLE "catalogue"."program_pathway" (
	"from_program_id" uuid NOT NULL,
	"to_program_id" uuid NOT NULL,
	"condition_text" text,
	"min_cgpa" numeric(3, 2),
	"source_id" uuid,
	CONSTRAINT "program_pathway_from_program_id_to_program_id_pk" PRIMARY KEY("from_program_id","to_program_id")
);
--> statement-breakpoint
CREATE TABLE "catalogue"."program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid,
	"program_name" text NOT NULL,
	"study_level" "catalogue"."study_level" NOT NULL,
	"duration_semesters" integer,
	"publish_status" "catalogue"."review_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue"."requirement_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requirement_id" uuid NOT NULL,
	"group_no" integer NOT NULL,
	"rule_type" "catalogue"."rule_type" NOT NULL,
	"subject_id" uuid,
	"related_field_id" uuid,
	"min_grade" text,
	"min_value" numeric(5, 2),
	"evidence_quote" text
);
--> statement-breakpoint
CREATE TABLE "catalogue"."requirement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"source_id" uuid,
	"prepared_by" uuid NOT NULL,
	"approved_by" uuid,
	"entry_route" text NOT NULL,
	"version_no" integer NOT NULL,
	"review_status" "catalogue"."review_status" DEFAULT 'draft' NOT NULL,
	"return_reason" text,
	"effective_from" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue"."subject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_name" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"category" text,
	"qualification" text NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalogue"."activity" ADD CONSTRAINT "activity_field_id_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "catalogue"."field"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."admission_stat" ADD CONSTRAINT "admission_stat_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "catalogue"."program"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."career" ADD CONSTRAINT "career_field_id_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "catalogue"."field"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program_field" ADD CONSTRAINT "program_field_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "catalogue"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program_field" ADD CONSTRAINT "program_field_field_id_field_id_fk" FOREIGN KEY ("field_id") REFERENCES "catalogue"."field"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program_pathway" ADD CONSTRAINT "program_pathway_from_program_id_program_id_fk" FOREIGN KEY ("from_program_id") REFERENCES "catalogue"."program"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program_pathway" ADD CONSTRAINT "program_pathway_to_program_id_program_id_fk" FOREIGN KEY ("to_program_id") REFERENCES "catalogue"."program"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."program" ADD CONSTRAINT "program_institution_id_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "catalogue"."institution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" ADD CONSTRAINT "requirement_rule_requirement_id_requirement_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "catalogue"."requirement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" ADD CONSTRAINT "requirement_rule_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "catalogue"."subject"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement_rule" ADD CONSTRAINT "requirement_rule_related_field_id_field_id_fk" FOREIGN KEY ("related_field_id") REFERENCES "catalogue"."field"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue"."requirement" ADD CONSTRAINT "requirement_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "catalogue"."program"("id") ON DELETE no action ON UPDATE no action;