ALTER TYPE "profile"."education_level" ADD VALUE 'after_certificate';--> statement-breakpoint
ALTER TABLE "profile"."academic_record" ADD COLUMN "qualification_level" smallint;--> statement-breakpoint
-- Diploma holders are now "after pre-university / diploma" with the diploma as their qualification.
UPDATE "profile"."student" SET "education_level" = 'after_preu', "higher_qualification" = 'diploma' WHERE "education_level" = 'after_diploma';
