CREATE SCHEMA IF NOT EXISTS "recommendation";
--> statement-breakpoint
CREATE TYPE "recommendation"."eligibility" AS ENUM('eligible', 'almost', 'not_yet');--> statement-breakpoint
CREATE TYPE "recommendation"."offer_chance" AS ENUM('high', 'medium', 'low', 'no_data');--> statement-breakpoint
CREATE TABLE "recommendation"."recommendation" (
	"student_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"program_name" text NOT NULL,
	"eligibility" "recommendation"."eligibility" NOT NULL,
	"score" smallint NOT NULL,
	"offer_chance" "recommendation"."offer_chance" NOT NULL,
	"offer_margin" numeric(5, 1),
	"is_top_match" boolean DEFAULT false NOT NULL,
	"is_target_based" boolean DEFAULT false NOT NULL,
	"reasons" jsonb NOT NULL,
	"missing" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recommendation_student_id_program_id_pk" PRIMARY KEY("student_id","program_id")
);
