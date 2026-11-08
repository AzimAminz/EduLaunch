-- The first crawler (watched pages by checksum, then AI drafts) was replaced by the ePanduan import: its tables go.
drop table if exists content_chunk;
drop table if exists extraction_draft;
drop table if exists data_source;

-- ePanduan import tables, named for what they hold.
alter table if exists epanduan_run rename to import_run;
alter table if exists epanduan_found rename to import_program;
alter table if exists epanduan_requirement rename to import_requirement;

-- Constraint and index names follow the tables.
alter table import_run rename constraint epanduan_run_pkey to import_run_pkey;
alter table import_run rename constraint epanduan_run_institution_code_check to import_run_institution_code_check;
alter table import_run rename constraint epanduan_run_status_check to import_run_status_check;
alter index epanduan_run_institution_idx rename to import_run_institution_idx;
alter table import_program rename constraint epanduan_found_pkey to import_program_pkey;
alter table import_program rename constraint epanduan_found_code_check to import_program_code_check;
alter table import_program rename constraint epanduan_found_run_id_fkey to import_program_run_id_fkey;
alter table import_requirement rename constraint epanduan_requirement_pkey to import_requirement_pkey;
alter table import_requirement rename constraint epanduan_requirement_code_check to import_requirement_code_check;
alter table import_requirement rename constraint epanduan_requirement_status_check to import_requirement_status_check;
