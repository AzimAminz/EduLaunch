-- Form 4–5 grades are now kept per school year (one record per form), like Form 1–3 results.
-- Earlier target records stored the SPM year, which can be ahead; they become this year's record.
UPDATE "profile"."academic_record"
SET "exam_year" = EXTRACT(YEAR FROM now())::smallint
WHERE "record_kind" = 'target' AND ("exam_year" IS NULL OR "exam_year" > EXTRACT(YEAR FROM now()));
