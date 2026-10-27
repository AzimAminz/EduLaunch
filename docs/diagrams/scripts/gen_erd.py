"""Generates the EduLaunch ERD (Mermaid): full simple diagram + one diagram per module.

Usage: python3 docs/diagrams/scripts/gen_erd.py docs/diagrams/erd
Edit E (tables), R (relationships) and M (module ownership) below, then re-run
this script and gen_drawio.py. Roles: student and admin only.
Technical tables (audit log, AI_CHAT, CONTENT_CHUNK, NOTIFICATION, sessions) exist in the
database but are left out of this documentation ERD. Links between services (EPANDUAN_* to PROGRAM, by programme
code) are logical, without a foreign key: each service owns its own schema.
"""
import os, sys
ZW = '\u200b'  # Mermaid needs a token before each attribute; this keeps the column blank
OUT = sys.argv[1]

# table -> list of (column, key)
E = {
 'USER': [('user_id','PK'),('full_name',''),('email',''),('password_hash',''),('role',''),('account_status',''),('created_at','')],
 'STUDENT': [('student_id','PK'),('user_id','FK'),('education_level',''),('form_year',''),('stream_program_id','FK'),('school_name',''),('date_of_birth',''),('parent_consent_at','')],
 'SUBJECT': [('subject_id','PK'),('subject_name',''),('aliases',''),('category',''),('qualification',''),('is_mandatory','')],
 'ACADEMIC_RECORD': [('record_id','PK'),('student_id','FK'),('diploma_program_id','FK'),('qualification',''),('record_kind',''),('exam_year',''),('cgpa',''),('muet_band',''),('entry_source',''),('document_file',''),('extraction_status',''),('record_status',''),('confirmed_at','')],
 'RECORD_SUBJECT': [('record_id','PK, FK'),('subject_id','PK, FK'),('grade',''),('read_confidence',''),('review_note','')],
 'INSTITUTION': [('institution_id','PK'),('institution_name',''),('short_name',''),('institution_type',''),('state',''),('website_url',''),('epanduan_code',''),('deletion_requested_by','FK')],
 'INSTITUTION_SOURCE': [('source_id','PK'),('institution_id','FK'),('kind',''),('url',''),('label','')],
 'NEC_FIELD': [('nec_code','PK'),('field_id','FK'),('nec_name','')],
 'FIELD': [('field_id','PK'),('parent_field_id','FK'),('field_name',''),('riasec_weights','')],
 'PROGRAM': [('program_id','PK'),('institution_id','FK'),('nec_code','FK'),('prepared_by','FK'),('approved_by','FK'),('program_name',''),('upu_code',''),('study_level',''),('duration_semesters',''),('study_mode',''),('campuses',''),('careers',''),('fees / note',''),('is_stem / is_tvet',''),('joint_degree / feeder',''),('publish_status',''),('pending_changes','')],
 'PROGRAM_ENTRY_ROUTE': [('entry_route_id','PK'),('program_id','FK'),('entry_route',''),('source_category','')],
 'PROGRAM_FIELD': [('program_id','PK, FK'),('field_id','PK, FK')],
 'PROGRAM_PATHWAY': [('from_program_id','PK, FK'),('to_program_id','PK, FK'),('condition_text',''),('min_cgpa',''),('source_id','FK')],
 'SAVED_PROGRAM': [('student_id','PK, FK'),('program_id','PK, FK'),('in_comparison',''),('note',''),('saved_at','')],
 'REQUIREMENT': [('requirement_id','PK'),('program_id','FK'),('source_id','FK'),('prepared_by','FK'),('approved_by','FK'),('entry_route',''),('source_category',''),('source_url',''),('version_no',''),('review_status','')],
 'REQUIREMENT_RULE': [('rule_id','PK'),('requirement_id','FK'),('subject_id','FK'),('related_field_id','FK'),('rule_type',''),('part',''),('section',''),('min_grade',''),('min_value',''),('subject_ids',''),('min_count',''),('position',''),('evidence_quote','')],
 'MERIT_FORMULA': [('formula_id','PK'),('approved_by','FK'),('entry_route',''),('academic_weight',''),('cocurricular_weight',''),('version_no',''),('review_status','')],
 'ADMISSION_STAT': [('stat_id','PK'),('program_id','FK'),('source_id','FK'),('intake_year',''),('lowest_merit',''),('average_merit',''),('applicants',''),('places','')],
 'ASSESSMENT': [('assessment_id','PK'),('student_id','FK'),('instrument_version',''),('answers',''),('riasec_scores',''),('completed_at','')],
 'ACTIVITY': [('activity_id','PK'),('field_id','FK'),('activity_title',''),('activity_type','')],
 'ACTIVITY_ATTEMPT': [('student_id','PK, FK'),('activity_id','PK, FK'),('enjoyment_rating',''),('reflection',''),('completed_at','')],
 'RECOMMENDATION': [('student_id','PK, FK'),('program_id','PK, FK'),('eligibility',''),('score',''),('offer_chance',''),('is_top_match',''),('is_target_based',''),('reasons',''),('generated_at','')],
 'ROADMAP': [('roadmap_id','PK'),('student_id','FK'),('roadmap_title',''),('version_no',''),('is_active','')],
 'ROADMAP_STEP': [('step_id','PK'),('roadmap_id','FK'),('parent_step_id','FK'),('program_id','FK'),('career_id','FK'),('step_type',''),('step_label',''),('step_order','')],
 'CAREER': [('career_id','PK'),('field_id','FK'),('source_id','FK'),('career_title',''),('description',''),('min_study_level',''),('outlook_note','')],
 'DATA_SOURCE': [('source_id','PK'),('institution_id','FK'),('source_url',''),('source_type',''),('content_checksum',''),('last_checked_at',''),('crawl_status','')],
 'EPANDUAN_RUN': [('run_id','PK'),('requested_by','FK'),('institution_code',''),('status',''),('current_category',''),('pages_read',''),('found',''),('error',''),('started_at','')],
 'EPANDUAN_FOUND': [('run_id','PK, FK'),('code','PK'),('data','')],
 'EPANDUAN_REQUIREMENT': [('code','PK'),('category','PK'),('jenprog',''),('status',''),('special_text',''),('read_at','')],
 'SUPPORT_TICKET': [('ticket_id','PK'),('user_id','FK'),('assigned_admin_id','FK'),('program_id','FK'),('category',''),('message',''),('ticket_status','')],
}

# (parent, cardinality, child, label) — child holds the FK. '--' strong, '..' weak
R = [
 ('USER','||--o|','STUDENT','is a'),
 ('STUDENT','||--o{','ACADEMIC_RECORD','owns'),
 ('ACADEMIC_RECORD','||--|{','RECORD_SUBJECT','contains'),
 ('SUBJECT','||--o{','RECORD_SUBJECT','graded in'),
 ('PROGRAM','|o..o{','ACADEMIC_RECORD','diploma program'),
 ('INSTITUTION','||--o{','PROGRAM','offers'),
 ('PROGRAM','||--|{','PROGRAM_FIELD','belongs to'),
 ('FIELD','||--o{','PROGRAM_FIELD','covers'),
 ('FIELD','|o..o{','FIELD','sub-field'),
 ('PROGRAM','||--o{','PROGRAM_PATHWAY','leads to'),
 ('PROGRAM','||--o{','PROGRAM_PATHWAY','reached from'),
 ('DATA_SOURCE','|o..o{','PROGRAM_PATHWAY','source of'),
 ('STUDENT','||--o{','SAVED_PROGRAM','saves'),
 ('PROGRAM','||--o{','SAVED_PROGRAM','saved by'),
 ('PROGRAM','||--o{','REQUIREMENT','has'),
 ('REQUIREMENT','||--|{','REQUIREMENT_RULE','consists of'),
 ('SUBJECT','|o..o{','REQUIREMENT_RULE','required subject'),
 ('FIELD','|o..o{','REQUIREMENT_RULE','related field'),
 ('DATA_SOURCE','|o..o{','REQUIREMENT','evidence for'),
 ('USER','|o..o{','REQUIREMENT','approves'),
 ('USER','|o..o{','MERIT_FORMULA','approves'),
 ('PROGRAM','||--o{','ADMISSION_STAT','has history'),
 ('DATA_SOURCE','|o..o{','ADMISSION_STAT','source of'),
 ('STUDENT','||--o{','ASSESSMENT','takes'),
 ('FIELD','||..o{','ACTIVITY','field activity'),
 ('STUDENT','||--o{','ACTIVITY_ATTEMPT','attempts'),
 ('ACTIVITY','||--o{','ACTIVITY_ATTEMPT','attempted in'),
 ('STUDENT','||--o{','RECOMMENDATION','receives'),
 ('PROGRAM','||--o{','RECOMMENDATION','recommended in'),
 ('STUDENT','||--o{','ROADMAP','builds'),
 ('ROADMAP','||--|{','ROADMAP_STEP','contains'),
 ('ROADMAP_STEP','|o..o{','ROADMAP_STEP','branches to'),
 ('PROGRAM','|o..o{','ROADMAP_STEP','referenced by'),
 ('DATA_SOURCE','|o..o{','CAREER','source of'),
 ('FIELD','||--o{','CAREER','leads to'),
 ('PROGRAM','|o..o{','STUDENT','chosen stream'),
 ('CAREER','|o..o{','ROADMAP_STEP','career goal'),
 ('INSTITUTION','||--o{','DATA_SOURCE','publishes'),
 ('INSTITUTION','||--o{','INSTITUTION_SOURCE','lists'),
 ('FIELD','|o..o{','NEC_FIELD','suggested by'),
 ('NEC_FIELD','|o..o{','PROGRAM','classifies'),
 ('PROGRAM','||--o{','PROGRAM_ENTRY_ROUTE','takes'),
 ('USER','|o..o{','PROGRAM','prepares'),
 ('USER','|o..o{','EPANDUAN_RUN','starts'),
 ('EPANDUAN_RUN','||--o{','EPANDUAN_FOUND','finds'),
 ('PROGRAM','|o..o{','EPANDUAN_FOUND','matched by code'),
 ('PROGRAM','|o..o{','EPANDUAN_REQUIREMENT','matched by code'),
 ('USER','|o..o{','SUPPORT_TICKET','opens'),
 ('USER','|o..o{','SUPPORT_TICKET','handles'),
 ('PROGRAM','|o..o{','SUPPORT_TICKET','reported in'),
]

# module -> owned tables (matches docs/system-design.md section 3)
M = [
 ('01-identity-access','Identity & Access',['USER','STUDENT']),
 ('02-academic-profile','Academic Profile',['SUBJECT','ACADEMIC_RECORD','RECORD_SUBJECT']),
 ('03-programme-catalogue','Programme Catalogue',['INSTITUTION','INSTITUTION_SOURCE','PROGRAM','PROGRAM_ENTRY_ROUTE','NEC_FIELD','FIELD','PROGRAM_FIELD','SAVED_PROGRAM','PROGRAM_PATHWAY']),
 ('04-eligibility-prediction','Eligibility & Prediction',['REQUIREMENT','REQUIREMENT_RULE','MERIT_FORMULA','ADMISSION_STAT']),
 ('05-self-discovery','Self Discovery',['ASSESSMENT','ACTIVITY','ACTIVITY_ATTEMPT']),
 ('06-recommendation-ai','Recommendation & AI',['RECOMMENDATION']),
 ('07-study-career-planning','Study & Career Planning',['ROADMAP','ROADMAP_STEP','CAREER']),
 ('08-content-pipeline','Content Pipeline',['DATA_SOURCE','EPANDUAN_RUN','EPANDUAN_FOUND','EPANDUAN_REQUIREMENT']),
 ('09-notifications-support','Notifications & Support',['SUPPORT_TICKET']),
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
