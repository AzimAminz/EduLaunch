ALTER TABLE "profile"."academic_record" ADD COLUMN "form_level" smallint;--> statement-breakpoint
-- Records of students still in Form 1–3 or Form 4–5: the form follows from their current form and the year.
UPDATE "profile"."academic_record" r SET "form_level" = s."form_year" - (EXTRACT(YEAR FROM now())::int - r."exam_year")
FROM "profile"."student" s
WHERE r."student_id" = s."id" AND r."exam_year" IS NOT NULL AND s."form_year" IS NOT NULL
  AND ((r."record_kind" = 'school' AND s."education_level" = 'form1_3' AND s."form_year" - (EXTRACT(YEAR FROM now())::int - r."exam_year") BETWEEN 1 AND 3)
    OR (r."record_kind" = 'target' AND s."education_level" = 'form4_5' AND s."form_year" - (EXTRACT(YEAR FROM now())::int - r."exam_year") BETWEEN 4 AND 5));
