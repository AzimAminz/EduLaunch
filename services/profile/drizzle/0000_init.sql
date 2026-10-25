CREATE SCHEMA IF NOT EXISTS "profile";
--> statement-breakpoint
CREATE TYPE "profile"."account_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "profile"."education_level" AS ENUM('form1_3', 'form4_5', 'after_spm', 'after_preu', 'after_diploma');--> statement-breakpoint
CREATE TYPE "profile"."record_kind" AS ENUM('actual', 'target', 'school');--> statement-breakpoint
CREATE TYPE "profile"."record_status" AS ENUM('draft', 'confirmed');--> statement-breakpoint
CREATE TYPE "profile"."role" AS ENUM('student', 'admin');--> statement-breakpoint
CREATE TABLE "profile"."academic_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"diploma_program_id" uuid,
	"qualification" text NOT NULL,
	"record_kind" "profile"."record_kind" NOT NULL,
	"exam_year" smallint,
	"cgpa" numeric(3, 2),
	"muet_band" numeric(2, 1),
	"entry_source" text DEFAULT 'manual' NOT NULL,
	"document_file" text,
	"extraction_status" text,
	"record_status" "profile"."record_status" DEFAULT 'draft' NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profile"."account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"role" "profile"."role" DEFAULT 'student' NOT NULL,
	"account_status" "profile"."account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile"."activity_attempt" (
	"student_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"enjoyment_rating" smallint,
	"reflection" text,
	"completed_at" timestamp with time zone,
	CONSTRAINT "activity_attempt_student_id_activity_id_pk" PRIMARY KEY("student_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "profile"."assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"instrument_version" text NOT NULL,
	"answers" jsonb NOT NULL,
	"riasec_scores" jsonb,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profile"."record_subject" (
	"record_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"grade" text NOT NULL,
	"read_confidence" numeric(3, 2),
	"review_note" text,
	CONSTRAINT "record_subject_record_id_subject_id_pk" PRIMARY KEY("record_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "profile"."roadmap_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"parent_step_id" uuid,
	"program_id" uuid,
	"career_id" uuid,
	"step_type" text NOT NULL,
	"step_label" text NOT NULL,
	"step_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile"."roadmap" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"roadmap_title" text NOT NULL,
	"version_no" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile"."saved_program" (
	"student_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"in_comparison" boolean DEFAULT false NOT NULL,
	"note" text,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_program_student_id_program_id_pk" PRIMARY KEY("student_id","program_id")
);
--> statement-breakpoint
CREATE TABLE "profile"."student" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"education_level" "profile"."education_level",
	"form_year" smallint,
	"stream_program_id" uuid,
	"school_name" text,
	"date_of_birth" date,
	"parent_consent_at" timestamp with time zone,
	CONSTRAINT "student_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
ALTER TABLE "profile"."academic_record" ADD CONSTRAINT "academic_record_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "profile"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."activity_attempt" ADD CONSTRAINT "activity_attempt_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "profile"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."assessment" ADD CONSTRAINT "assessment_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "profile"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."record_subject" ADD CONSTRAINT "record_subject_record_id_academic_record_id_fk" FOREIGN KEY ("record_id") REFERENCES "profile"."academic_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."roadmap_step" ADD CONSTRAINT "roadmap_step_roadmap_id_roadmap_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "profile"."roadmap"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."roadmap" ADD CONSTRAINT "roadmap_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "profile"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."saved_program" ADD CONSTRAINT "saved_program_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "profile"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."student" ADD CONSTRAINT "student_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "profile"."account"("id") ON DELETE cascade ON UPDATE no action;