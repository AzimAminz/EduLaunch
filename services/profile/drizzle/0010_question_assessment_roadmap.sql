CREATE TABLE "profile"."assessment" (
	"student_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer" smallint NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_student_id_question_id_pk" PRIMARY KEY("student_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "profile"."question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_text" text NOT NULL,
	"question_text_en" text,
	"riasec_type" text NOT NULL,
	"test_version" text DEFAULT 'v1' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile"."roadmap_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"step_type" text NOT NULL,
	"program_id" uuid,
	"career_id" uuid,
	"step_label" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile"."student" ADD COLUMN "riasec_scores" jsonb;--> statement-breakpoint
ALTER TABLE "profile"."student" ADD COLUMN "interest_test_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profile"."assessment" ADD CONSTRAINT "assessment_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "profile"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."assessment" ADD CONSTRAINT "assessment_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "profile"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile"."roadmap_step" ADD CONSTRAINT "roadmap_step_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "profile"."student"("id") ON DELETE cascade ON UPDATE no action;