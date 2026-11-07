"""Generates the EduLaunch ERD (Mermaid): full simple diagram + one diagram per module.

Usage: python3 docs/diagrams/scripts/gen_erd.py docs/diagrams/erd
Edit E (tables), R (relationships) and M (module ownership) below, then re-run
this script and gen_drawio.py. Roles: student and admin only.
Every table of the database is shown (30). Links between services (STUDENT to PROGRAM, IMPORT_* to PROGRAM by
programme code, ACCOUNT to admin columns) are logical, without a foreign key: each service owns its own schema.
"""
import os, sys
ZW = '\u200b'  # Mermaid needs a token before each attribute; this keeps the column blank
OUT = sys.argv[1]

# table -> list of (column, key). Names match the database tables and columns.
E = {
 'ACCOUNT': [('account_id','PK'),('full_name',''),('role',''),('account_status',''),('created_at','')],
 'STUDENT': [('student_id','PK'),('account_id','FK'),('stream_program_id','FK'),('education_level',''),('form_year',''),('higher_qualification',''),('school_name',''),('date_of_birth',''),('riasec_scores',''),('interest_test_at','')],
 'QUESTION': [('question_id','PK'),('question_text',''),('riasec_type',''),('test_version',''),('display_order',''),('is_active','')],
 'ASSESSMENT': [('student_id','PK, FK'),('question_id','PK, FK'),('answer',''),('answered_at','')],
 'SUBJECT': [('subject_id','PK'),('subject_name',''),('aliases',''),('category',''),('qualification',''),('is_mandatory','')],
 'ACADEMIC_RECORD': [('record_id','PK'),('student_id','FK'),('field_id','FK'),('qualification',''),('record_kind',''),('exam_year',''),('cgpa',''),('muet_band',''),('entry_source',''),('document_file',''),('record_status',''),('confirmed_at','')],
 'RECORD_SUBJECT': [('record_id','PK, FK'),('subject_id','PK, FK'),('grade',''),('ocr_confidence',''),('review_note','')],
 'INSTITUTION': [('institution_id','PK'),('institution_name',''),('short_name',''),('institution_type',''),('state',''),('website_url',''),('epanduan_code',''),('deletion_requested_by','FK')],
 'INSTITUTION_SOURCE': [('source_id','PK'),('institution_id','FK'),('kind',''),('url',''),('label','')],
 'FIELD': [('field_id','PK'),('parent_field_id','FK'),('field_name',''),('riasec_weights','')],
 'NEC_FIELD': [('nec_code','PK'),('field_id','FK'),('nec_name','')],
 'PROGRAM': [('program_id','PK'),('institution_id','FK'),('nec_code','FK'),('prepared_by','FK'),('approved_by','FK'),('program_code',''),('program_name',''),('study_level',''),('duration_semesters',''),('study_mode',''),('campuses',''),('careers',''),('fees / note',''),('is_stem / is_tvet',''),('joint_degree / feeder',''),('publish_status',''),('pending_changes','')],
 'PROGRAM_FIELD': [('program_id','PK, FK'),('field_id','PK, FK')],
 'PROGRAM_ENTRY_ROUTE': [('entry_route_id','PK'),('program_id','FK'),('entry_route',''),('source_category','')],
 'PROGRAM_PATHWAY': [('from_program_id','PK, FK'),('to_program_id','PK, FK'),('condition_text',''),('min_cgpa','')],
 'ADMISSION_STAT': [('stat_id','PK'),('program_id','FK'),('intake_year',''),('lowest_merit',''),('average_merit',''),('applicants',''),('places','')],
 'ENTRY_REQUIREMENT': [('requirement_id','PK'),('program_id','FK'),('prepared_by','FK'),('approved_by','FK'),('entry_route',''),('source_category',''),('source_url',''),('version_no',''),('review_status','')],
 'REQUIREMENT_CONDITION': [('condition_id','PK'),('requirement_id','FK'),('field_id','FK'),('part',''),('section',''),('position',''),('or_group',''),('condition_type',''),('min_grade',''),('min_value',''),('min_count',''),('official_text','')],
 'CONDITION_SUBJECT': [('condition_id','PK, FK'),('subject_id','PK, FK'),('position','')],
 'SAVED_PROGRAM': [('student_id','PK, FK'),('program_id','PK, FK'),('in_comparison',''),('note',''),('saved_at','')],
 'RECOMMENDATION': [('student_id','PK, FK'),('program_id','PK, FK'),('eligibility',''),('score',''),('offer_chance',''),('is_top_match',''),('is_target_based',''),('reasons',''),('generated_at','')],
 'CAREER': [('career_id','PK'),('field_id','FK'),('career_title',''),('description',''),('min_study_level',''),('outlook_note','')],
 'ACTIVITY': [('activity_id','PK'),('field_id','FK'),('activity_title',''),('activity_type','')],
 'ACTIVITY_ATTEMPT': [('student_id','PK, FK'),('activity_id','PK, FK'),('enjoyment_rating',''),('reflection',''),('completed_at','')],
 'ROADMAP_STEP': [('step_id','PK'),('student_id','FK'),('program_id','FK'),('career_id','FK'),('step_order',''),('step_type',''),('step_label','')],
 'IMPORT_RUN': [('run_id','PK'),('requested_by','FK'),('institution_code',''),('status',''),('current_category',''),('pages_read',''),('found',''),('error',''),('started_at','')],
 'IMPORT_PROGRAM': [('run_id','PK, FK'),('code','PK'),('data','')],
 'IMPORT_REQUIREMENT': [('code','PK'),('category','PK'),('jenprog',''),('status',''),('special_text',''),('read_at','')],
 'NOTIFICATION': [('notification_id','PK'),('account_id','FK'),('program_id','FK'),('notification_type',''),('message',''),('read_at','')],
 'SUPPORT_TICKET': [('ticket_id','PK'),('account_id','FK'),('assigned_admin_id','FK'),('program_id','FK'),('category',''),('message',''),('admin_reply',''),('ticket_status','')],
}

# (parent, cardinality, child, label) — child holds the FK. '--' strong, '..' weak
R = [
 ('ACCOUNT','||--o|','STUDENT','is a'),
 ('STUDENT','||--o{','ASSESSMENT','answers'),
 ('QUESTION','||--o{','ASSESSMENT','answered in'),
 ('STUDENT','||--o{','ACADEMIC_RECORD','owns'),
 ('ACADEMIC_RECORD','||--|{','RECORD_SUBJECT','contains'),
 ('SUBJECT','||--o{','RECORD_SUBJECT','graded in'),
 ('FIELD','|o..o{','ACADEMIC_RECORD','diploma field'),
 ('STUDENT','||--o{','RECOMMENDATION','receives'),
 ('PROGRAM','||--o{','RECOMMENDATION','recommended in'),
 ('INSTITUTION','||--o{','PROGRAM','offers'),
 ('INSTITUTION','||--o{','INSTITUTION_SOURCE','lists'),
 ('PROGRAM','||--|{','PROGRAM_FIELD','belongs to'),
 ('FIELD','||--o{','PROGRAM_FIELD','covers'),
 ('FIELD','|o..o{','FIELD','sub-field'),
 ('FIELD','|o..o{','NEC_FIELD','suggested by'),
 ('NEC_FIELD','|o..o{','PROGRAM','classifies'),
 ('PROGRAM','||--o{','PROGRAM_ENTRY_ROUTE','takes'),
 ('PROGRAM','||--o{','PROGRAM_PATHWAY','leads to'),
 ('PROGRAM','||--o{','PROGRAM_PATHWAY','reached from'),
 ('PROGRAM','||--o{','ADMISSION_STAT','has history'),
 ('PROGRAM','||--o{','ENTRY_REQUIREMENT','has'),
 ('ENTRY_REQUIREMENT','||--|{','REQUIREMENT_CONDITION','consists of'),
 ('REQUIREMENT_CONDITION','||--o{','CONDITION_SUBJECT','names'),
 ('SUBJECT','||--o{','CONDITION_SUBJECT','required in'),
 ('FIELD','|o..o{','REQUIREMENT_CONDITION','related field'),
 ('ACCOUNT','|o..o{','PROGRAM','prepares'),
 ('ACCOUNT','|o..o{','ENTRY_REQUIREMENT','approves'),
 ('STUDENT','||--o{','SAVED_PROGRAM','saves'),
 ('PROGRAM','||--o{','SAVED_PROGRAM','saved by'),
 ('PROGRAM','|o..o{','STUDENT','chosen stream'),
 ('FIELD','||--o{','CAREER','leads to'),
 ('FIELD','||..o{','ACTIVITY','field activity'),
 ('STUDENT','||--o{','ACTIVITY_ATTEMPT','attempts'),
 ('ACTIVITY','||--o{','ACTIVITY_ATTEMPT','attempted in'),
 ('STUDENT','||--o{','ROADMAP_STEP','plans'),
 ('PROGRAM','|o..o{','ROADMAP_STEP','referenced by'),
 ('CAREER','|o..o{','ROADMAP_STEP','career goal'),
 ('ACCOUNT','|o..o{','IMPORT_RUN','starts'),
 ('IMPORT_RUN','||--o{','IMPORT_PROGRAM','finds'),
 ('PROGRAM','|o..o{','IMPORT_PROGRAM','matched by code'),
 ('PROGRAM','|o..o{','IMPORT_REQUIREMENT','matched by code'),
 ('ACCOUNT','||--o{','NOTIFICATION','receives'),
 ('PROGRAM','|o..o{','NOTIFICATION','about'),
 ('ACCOUNT','|o..o{','SUPPORT_TICKET','opens'),
 ('ACCOUNT','|o..o{','SUPPORT_TICKET','handles'),
 ('PROGRAM','|o..o{','SUPPORT_TICKET','reported in'),
]

# module -> owned tables (matches docs/system-design.md section 3)
M = [
 ('01-identity-access','Identity & Access',['ACCOUNT','STUDENT']),
 ('02-academic-profile','Academic Profile',['SUBJECT','ACADEMIC_RECORD','RECORD_SUBJECT']),
 ('03-programme-catalogue','Programme Catalogue',['INSTITUTION','INSTITUTION_SOURCE','PROGRAM','PROGRAM_ENTRY_ROUTE','NEC_FIELD','FIELD','PROGRAM_FIELD','SAVED_PROGRAM','PROGRAM_PATHWAY']),
 ('04-eligibility-prediction','Eligibility & Prediction',['ENTRY_REQUIREMENT','REQUIREMENT_CONDITION','CONDITION_SUBJECT','ADMISSION_STAT']),
 ('05-self-discovery','Self Discovery',['QUESTION','ASSESSMENT','ACTIVITY','ACTIVITY_ATTEMPT']),
 ('06-recommendation-ai','Recommendation & AI',['RECOMMENDATION']),
 ('07-study-career-planning','Study & Career Planning',['ROADMAP_STEP','CAREER']),
 ('08-content-pipeline','Content Pipeline',['IMPORT_RUN','IMPORT_PROGRAM','IMPORT_REQUIREMENT']),
 ('09-notifications-support','Notifications & Support',['NOTIFICATION','SUPPORT_TICKET']),
]

def entity(name, ref=False):
    cols = E[name]
    if ref:
        cols = [c for c in cols if c[1].startswith('PK')][:1]
    lines = [f'    {name} {{']
    for c,k in cols:
        lines.append(f'        {ZW}{k.replace(", ", ",")} {c}' if k else f'        {ZW} {c}')
    lines.append('    }')
    return '\n'.join(lines)

def rel(a,c,b,l):
    return f'    {a} {c} {b} : "{l}"'

def diagram(owned=None):
    if owned is None:
        names = list(E); refs = set(); rels = R
    else:
        rels = [r for r in R if r[2] in owned]
        names = list(owned); refs = set()
        for a,_,b,_ in rels:
            for x in (a,b):
                if x not in owned and x not in refs: refs.add(x)
        names += sorted(refs)
    body = ['erDiagram'] + [entity(n, n in refs) for n in names] + [''] + [rel(*r) for r in rels]
    return '\n'.join(body) + '\n', len(names), len(rels)

os.makedirs(os.path.join(OUT,'modules'), exist_ok=True)
txt, n, r = diagram()
open(os.path.join(OUT,'edulaunch-erd-simple-en.mmd'),'w').write(txt)
print('full', n, r)
for slug, title, owned in M:
    t, n, r = diagram(owned)
    open(os.path.join(OUT,'modules',f'{slug}.mmd'),'w').write(t)
    print(slug, n, r)
