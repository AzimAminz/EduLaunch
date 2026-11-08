# EduLaunch database

30 tables in five schemas, one per service. Each service owns its tables; links between services (for example a
student's recommendation to a programme) hold the other table's id without a foreign key. The diagrams are in
`docs/diagrams/erd/` (`edulaunch-erd.drawio`, one page per module) and are generated from
`docs/diagrams/scripts/gen_erd.py`.

## Naming rules

- Tables are singular nouns (`program`, not `programs`). A table that links two others is named after both
  (`program_field`, `condition_subject`).
- Every table's key is `id`. In diagrams it is shown as `<table>_id` so a foreign key reads the same on both sides.
- Columns say what they hold: `program_code`, `official_text`, `min_grade`. Yes / no columns start with `is_` or
  `has_`; times end with `_at`; years with `_year`.
- Status columns use a fixed list of values (`draft`, `in_review`, `returned`, `published`, `archived`).

## The lecturer's diagram and where each entity is

| In the diagram | Table | Note |
|---|---|---|
| Student | `student` (with `account` for the login) | Admins have an `account` but no `student` row |
| Question | `question` | Each statement of the interest test |
| Assessment | `assessment` | One row per student and question: the answer. The RIASEC result is kept on `student` |
| Recommendation | `recommendation` | One row per student and programme |
| Program | `program` | |
| Entry Requirement | `entry_requirement` and `requirement_condition` | A requirement version per programme and route, and its lines |
| Conditional Subject | `condition_subject` | The subjects a requirement line names |
| Academic Record | `academic_record` | SPM, STPM, diploma… results of a student |
| Record Subject | `record_subject` | One grade in one subject of a record |
| Subject | `subject` | |

`entry_requirement` is split into a header and lines because one programme has several requirement lines per route
(Syarat Am and Syarat Khas, "Gred C bagi Bahasa Melayu", "PNGK 2.00"…) and each version is reviewed as a whole.

## Tables

### Identity (`profile`)

**account**: a person who logs in. `full_name`; `role` (`student` or `admin`); `account_status`; `created_at`. The
email and password are kept by Supabase Auth.

**student**: the student details of an account. `account_id`; `education_level` (form 1–3, form 4–5, after SPM…);
`form_year`; `higher_qualification` (STPM, matriculation, diploma… after SPM); `stream_program_id` (chosen Form 4
stream); `school_name`; `date_of_birth`; `riasec_scores` and `interest_test_at` (the interest test result).

### Academic profile (`profile`, `catalogue`)

**subject**: a school or exam subject. `subject_name`; `aliases` (other names, "BM"); `category`; `qualification`
(SPM, STPM…); `is_mandatory`.

**academic_record**: one set of results. `student_id`; `qualification`; `record_kind` (actual or target);
`exam_year`; `cgpa`; `muet_band`; `entry_source` (typed or read from a slip); `document_file`; `record_status`;
`confirmed_at`; `field_id` and `programme_name` for a diploma.

**record_subject**: one grade. `record_id`; `subject_id`; `grade`; `ocr_confidence` (how sure the slip reader was);
`review_note`.

### Self discovery (`profile`, `catalogue`)

**question**: `question_text`; `riasec_type` (R, I, A, S, E or C); `test_version`; `display_order`; `is_active`.

**assessment**: `student_id`; `question_id`; `answer` (1 = not like me … 5 = very like me); `answered_at`.

**activity**: a short task for one field. `field_id`; `activity_title`; `activity_type`.

**activity_attempt**: `student_id`; `activity_id`; `enjoyment_rating`; `reflection`; `completed_at`.

### Programme catalogue (`catalogue`)

**institution**: `institution_name`; `short_name`; `institution_type`; `state`; `website_url`; `epanduan_code` (two
letters, UC); `deletion_requested_by` (another admin approves a deletion).

**institution_source**: an official page of an institution. `institution_id`; `kind` (website, prospectus…); `url`;
`label`.

**field**: a broad field of study used for recommendations. `field_name`; `parent_field_id`; `riasec_weights`.

**nec_field**: the national education code (0712…). `nec_code`; `nec_name`; `field_id` (the field it suggests).

**program**: a programme (or a Form 4 stream). `program_code` (as on ePanduan, UC6522001); `program_name`;
`institution_id`; `study_level`; `duration_semesters`; `study_mode`; `nec_code`; `campuses`; `careers`; `fees`;
`note`; `is_stem`, `is_tvet`, `bumiputera_only`, `has_interview`, `joint_degree`, `feeder`; `source_url`;
`publish_status`; `prepared_by` and `approved_by` (two admins); `pending_changes` (a change waiting for approval).

**program_field**: the fields a programme belongs to.

**program_entry_route**: the routes a programme takes candidates from. `program_id`; `entry_route` (spm, stpm,
matrikulasi, diploma…); `source_category` (the ePanduan category, stpm:S).

**program_pathway**: a programme that leads to another (diploma to degree). `from_program_id`; `to_program_id`;
`condition_text`; `min_cgpa`.

**saved_program**: `student_id`; `program_id`; `in_comparison`; `note`; `saved_at`.

### Eligibility (`catalogue`)

**entry_requirement**: one version of a programme's requirements for one route and one ePanduan candidate category
(STPM Sains and STPM Sastera can differ; categories with the same text share one requirement). `program_id`;
`entry_route`; `source_category` (stpm:S; null when written without ePanduan); `version_no`; `review_status`;
`source_url`; `prepared_by`; `approved_by`; `return_reason`. A student qualifies through whichever category of their
route they meet.

**requirement_condition**: one line of a requirement. `requirement_id`; `part` (general = Syarat Am, special =
Syarat Khas); `section` (SPM, STPM, MUET…); `position`; `or_group` (lines with the same number are alternatives,
ATAU); `condition_type` (`min_grade`, `subjects_from_list`, `min_credits`, `min_cgpa`, `min_muet`, `declaration`,
`note`); `min_grade`; `min_value`; `min_count`; `official_text` (the sentence as ePanduan writes it); `field_id`.

**condition_subject**: `condition_id`; `subject_id`; `position`.

**admission_stat**: `program_id`; `intake_year`; `lowest_merit`; `average_merit`; `applicants`; `places`.

### Recommendation (`recommendation`)

**recommendation**: `student_id`; `program_id`; `eligibility`; `score`; `offer_chance`; `is_top_match`;
`is_target_based`; `reasons`; `missing`; `generated_at`.

### Planning (`profile`, `catalogue`)

**career**: `field_id`; `career_title`; `description`; `min_study_level`; `outlook_note`.

**roadmap_step**: one step of a student's plan. `student_id`; `step_order`; `step_type` (programme, career or
note); `program_id`; `career_id`; `step_label`.

### ePanduan import (`content`)

**import_run**: one read of an institution's programmes. `institution_code`; `status`; `current_category`;
`pages_read`; `found`; `error`; `requested_by`; `started_at`; `finished_at`.

**import_program**: a programme a run found. `run_id`; `code`; `data` (cleaned values).

**import_requirement**: Syarat Khas of a programme in one category. `code`; `jenprog` (the ePanduan list, spm or
stpm, kept under its ePanduan name); `category`; `status`; `special_text`; `read_at`.

### Notifications and support (`engagement`)

**notification**: `account_id`; `program_id`; `notification_type`; `message`; `read_at`.

**support_ticket**: `account_id`; `assigned_admin_id`; `program_id`; `category`; `message`; `admin_reply`;
`ticket_status`; `closed_at`.

## Changes from the earlier design (November 2026)

| Before | Now | Why |
|---|---|---|
| `requirement`, `requirement_rule` | `entry_requirement`, `requirement_condition` | Names from the lecturer's diagram |
| `subject_id` and `subject_ids[]` on a rule | `condition_subject` | One place for the subjects a line names; a list in a column cannot be joined or checked |
| `group_no`, `rule_type`, `evidence_quote` | `or_group`, `condition_type`, `official_text` | Say what they mean |
| `upu_code` | `program_code` | The code is JPT's, used beyond UPU |
| `assessment.answers` (one JSON field) | `question` + `assessment` (one row per answer) | Answers can be queried and the test can change version |
| `roadmap` + `roadmap_step` | `roadmap_step` | A student has one plan; the header held nothing else |
| `merit_formula` | removed | UPU formulas are fixed; kept in code |
| `data_source`, `extraction_draft`, `content_chunk` | removed | The first page crawler, replaced by the ePanduan import |
| `epanduan_run`, `epanduan_found`, `epanduan_requirement` | `import_run`, `import_program`, `import_requirement` | Named for what they hold |
| `source_id` on four catalogue tables | removed | Pointed at the removed crawler table; requirements keep `source_url` |
| `read_confidence` | `ocr_confidence` | Says where the number comes from |
