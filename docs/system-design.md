# EduLaunch — System Design

Version 2 · 25 Oct 2026 · Status: proposed for implementation

EduLaunch helps Malaysian students find study programmes that fit their results and interests. It recommends programmes, estimates the chance of getting an offer, and answers questions using official sources. It runs on the web and as a mobile app.

---

## 1. Scope and assumptions

### Roles

There are only two roles.

| Role | What they do |
|---|---|
| **Student** | Builds an academic profile, explores programmes, sees recommendations and offer chances, plans a study roadmap. |
| **Admin** | Keeps the catalogue correct: universities, programmes, entry requirements, merit formulas, sources. Reviews content that the system collects. Handles support tickets. |

Parents, guardians and counsellors do **not** have accounts. A student under 18 confirms that a parent or guardian agreed before uploading documents; this is a consent checkbox, not a role.

### Assumptions

- University final-year project: one to three developers, about two semesters.
- Budget close to zero. Free tiers first; paid services only where they clearly save time.
- Expected load is small: a few hundred users during testing and the demo.
- Programme data covers a curated set of institutions first (for example 5 universities and 30–50 programmes), then grows.
- Historical admission data (past merit cut-offs) may be incomplete. Every prediction must say how much data it is based on.

### Non-functional requirements

| Area | Target |
|---|---|
| Accuracy | Published requirements are 100% admin-approved. Auto-read grades are always confirmed by the student. |
| Explainability | Every recommendation and prediction shows its reasons and its source. |
| Privacy (PDPA 2010) | Student documents and grades never go to an AI service that may train on them. Students can export and delete their data. |
| Cost | Runs at RM0 per month during development; a small, capped amount at most during the demo. |
| Performance | Pages load in under 2 s on 4G; recommendations return in under 3 s from cached scores. |
| Availability | Best effort (free hosting). No data loss: daily database backup. |

---

## 2. Architecture overview

> **Update (26 Oct 2026):** the team chose microservices — five services behind an API gateway, one Postgres schema per service and RabbitMQ events. See [architecture.md](architecture.md). The diagram below is the original single-app plan; module boundaries are unchanged.

```
 Student (web / mobile PWA)          Admin (web)
            │                             │
            ▼                             ▼
 ┌─────────────────────────────────────────────────┐
 │  Next.js app (UI + API routes)                    │
 │  • Auth & profile      • Catalogue & search       │
 │  • Eligibility engine  • Recommendation API       │
 │  • Admin console       • Notifications            │
 └───────────────┬───────────────────────┬─────────┘
                 │                       │
                 ▼                       ▼
 ┌──────────────────────────┐  ┌──────────────────────────────┐
 │ Supabase                   │  │ Python worker (scheduled jobs) │
 │ • Postgres (+ pgvector)     │◄─┤ • Content crawler & extractor  │
 │ • Auth                      │  │ • Slip OCR                     │
 │ • Storage (slips, PDFs)     │  │ • Prediction model training    │
 └──────────────────────────┘  │ • Embeddings for search & Q&A  │
                                 └──────────────┬───────────────┘
                                                ▼
                                 AI providers (cheapest first):
                                 local model (Ollama) → free API tier → paid API
```

### Key decisions

| Decision | Choice | Why | Trade-off |
|---|---|---|---|
| Mobile app | **Responsive web + PWA first**, native app later if needed | One codebase for web and mobile; the Figma mobile screens map directly to PWA layouts. | Fewer native features (no background tasks). Acceptable for this scope. |
| Backend | **Next.js API routes** for the app, **one Python worker** for heavy jobs | TypeScript for the product; Python for OCR, crawling and machine learning, where its libraries are strongest. | Two languages to maintain. Kept small: the worker only runs batch jobs. |
| Database | **Postgres on Supabase**, with pgvector | Relational data with strong integrity; vector search in the same database; free tier includes auth and file storage. | Free projects pause when idle; keep it active during the demo period. |
| Recommendation | **Rules + scoring formula**, not an LLM | Deterministic, explainable, free to run, easy to test. | Less "clever" than a learned model, but correct and defensible. |
| Prediction | **Margin against past cut-offs**, upgraded to logistic regression when there is enough data | Works with little data; easy to explain ("your merit is 2.1 points above last year's lowest offer"). | Coarse with little data; shown as High / Medium / Low with a data note. |
| Content | **Crawler + AI extraction + admin approval** | Keeps data fresh without trusting AI blindly. | Admin must review changes. This is intended. |
| Scheduling | **GitHub Actions cron** (free) | No server to keep running. | Jobs run at most every few minutes; fine for weekly crawls. |

---

## 3. Modules

Each module owns its tables. Other modules read through its API, never by writing to its tables. The ERD pages in `docs/diagrams/erd/` follow the same boundaries.

### 3.1 Identity & Access
- **Purpose:** sign up, log in, keep the profile, respect privacy.
- **Functions:** register with email; log in and reset password; choose education level during onboarding; edit profile; export or delete my data.
- **Owns:** `USER`, `STUDENT`.
- **Notes:** Supabase Auth handles passwords and sessions. `USER.role` is `student` or `admin`. Admin accounts are created by another admin, never by self sign-up.

### 3.2 Academic Profile
- **Purpose:** capture results correctly, with as little typing as possible.
- **Functions:** upload a result slip or transcript; review auto-read grades (only flagged rows need attention); add, remove or edit subjects; enter results manually; move to the next level when results are released.
- **Owns:** `SUBJECT`, `ACADEMIC_RECORD`, `RECORD_SUBJECT`.
- **Flow:** upload → OCR (local) → map subject names to the catalogue using aliases → validate grades against the scale → student confirms → saved. Nothing is saved before the student confirms.
- **Levels:** Form 1–3 (school grades), Form 4–5 (current + target), after SPM (actual), after STPM / Matriculation / Foundation / A-Level, after Diploma.

### 3.3 Programme Catalogue
- **Purpose:** the trusted list of institutions and programmes.
- **Functions:** search by university and field (combobox), filter by study level, view programme details, compare programmes, save programmes.
- **Owns:** `INSTITUTION`, `PROGRAM`, `FIELD`, `PROGRAM_FIELD`, `SAVED_PROGRAM`, `PROGRAM_PATHWAY`.
- **Coverage:** the catalogue includes certificate (Sijil) and skills (SKM) programmes, for example at community colleges and skills institutes, not only diplomas and degrees. Without them the system has nothing to offer students with weaker results.
- **Pathways:** `PROGRAM_PATHWAY` records stepping stones, for example "Certificate X leads to Diploma Y if CGPA ≥ 2.50", entered by admins from official sources.

### 3.4 Eligibility & Prediction
- **Purpose:** answer "Do I qualify?" and "How likely is an offer?".
- **Functions:** check entry requirements; calculate merit; list what is missing; estimate offer chance; label results as target or actual.
- **Owns:** `REQUIREMENT`, `REQUIREMENT_RULE`, `MERIT_FORMULA`, `ADMISSION_STAT`.
- **Eligibility engine:** each rule is checked in code (minimum grade in a subject, number of credits, CGPA, MUET band, stream, related diploma field). The output is *Eligible*, *Almost eligible* (at most one rule missed), or *Not yet eligible*, with the rule that failed.
- **What-if simulation:** re-runs the same rules with one grade raised by one step, to show which subject opens the most programmes ("If Mathematics goes from D to C, 14 more programmes open"). No AI, no cost.
- **Alternative pathways:** when a student has fewer than five eligible programmes at the level they aim for, the system switches to alternative-pathway mode (see `ai-and-cost-plan.md` §3). The student never sees an empty result.

### 3.5 Self Discovery
- **Purpose:** help students who do not know their interests yet.
- **Functions:** take the interest test (RIASEC); try short field activities; rate and reflect on each activity. The results feed the Form 4 stream suggestion (section 3.7) and programme recommendations (section 3.6).
- **Owns:** `ASSESSMENT` (answers kept as one JSON field), `ACTIVITY`, `ACTIVITY_ATTEMPT`. Questions live in a versioned instrument file, not a table.

### 3.6 Recommendation & AI Assistant
- **Purpose:** turn the profile into a short, explained list of programmes, and answer questions with sources.
- **Functions:** score and rank programmes; explain each one; highlight the top match; recompute when the profile changes; answer questions from official sources only.
- **Owns:** `RECOMMENDATION`. Chat history (`AI_CHAT`) is a technical table, left out of the documentation ERD.
- **Details:** see `ai-and-cost-plan.md`.

### 3.7 Study & Career Planning
- **Purpose:** show the path from today to a career, starting from the student's own level.
- **Functions:** build a roadmap for each education level; compare pathway branches; show the careers each field leads to; track next actions; keep versions.
- **Owns:** `ROADMAP`, `ROADMAP_STEP`, `CAREER`. Form 4 streams are stored as `PROGRAM` rows with `study_level = form4_stream`, so they reuse `PROGRAM_FIELD`, `PROGRAM_PATHWAY` and `REQUIREMENT_RULE` instead of having their own tables.
- **Roadmap by level:**

| Level | The roadmap starts with | Steps |
|---|---|---|
| Form 1–3 | **Which Form 4 stream suits me?** Streams ranked by interest and school grades | Form 3 → stream (Form 4–5) → SPM target grades → after-SPM routes → fields → careers |
| Form 4–5 / after SPM | Recommended programmes (section 3.6) | SPM → Foundation / Matriculation / STPM / Diploma → degree → careers |
| After STPM / Matriculation / Foundation / A-Level | Degree programmes | Degree → industrial training → careers |
| After Diploma | **Work now or continue studying?** | A: work now; B: degree (possibly from a later semester); C: work first, then study part-time |

- **Form 4 stream suggestion** (no AI):
  - `stream_score = 50 × interest_fit + 40 × subject_strength + 10 × activity_signal`.
  - `interest_fit` compares RIASEC scores with the weights of the stream's fields (`PROGRAM_FIELD` → `FIELD.riasec_weights`). `subject_strength` uses school grades in the stream's key subjects (`REQUIREMENT_RULE` with `rule_type = key_subject`), for example Science and Mathematics for Pure Science. `activity_signal` comes from ratings of field activities.
  - Each stream shows two template reasons and the fields it opens (`PROGRAM_FIELD`). A "what if I choose another stream?" view shows which fields become harder to reach.
  - Labelled as guidance only. The school makes the final decision, and school grades are never converted into SPM grades.
- **Careers for diploma graduates:**
  - Careers come from `CAREER`; each career belongs to one main field (`CAREER.field_id`). `CAREER.min_study_level` decides whether a career appears under "Can work now (Diploma accepted)" or "Opens with a degree".
  - Careers are sorted by interest fit. Each degree that opens a career is checked with the eligibility engine, so the student sees "Eligible" next to it.
  - No salary is shown unless an admin attaches an official source. Careers are presented as options to explore, never as a job guarantee.
- **Branches after a diploma:** A work now (careers at diploma level), B continue to a degree (only degrees the student is eligible for), C professional qualification, D work first then study (part-time, distance learning, APEL). Branches come from `CAREER` and `PROGRAM_PATHWAY`, checked by the eligibility engine.
- **Career data stays Malaysian and verified (planned):**
  - `CAREER` gains a MASCO 2020 code, the minimum qualification level (MQF) and its source; fields carry their NEC code, so a student's diploma field leads straight to its careers.
  - When a field has no verified careers, the student sees "being prepared" plus general information for the wider field group, and a **data gap** is recorded for admins.
  - The content pipeline drafts the missing careers and pathways from whitelisted Malaysian sources (section 3.8); an admin approves before students see them.
  - The roadmap itself is built by code from this data; no LLM writes a student's roadmap.

### 3.8 Content Pipeline
- **Purpose:** keep programme data fresh and correct.
- **Functions:** register official sources; crawl on a schedule (first source: the JPT ePanduan site); detect changes; extract requirements with AI into a draft; fill career and pathway data gaps from whitelisted Malaysian sources (MASCO, MyCOL, MQA, professional bodies, JPT); prepare text chunks for search and Q&A.
- **Owns:** `DATA_SOURCE`. Search chunks and embeddings (`CONTENT_CHUNK`) are a technical table, left out of the documentation ERD.
- **Rule:** the pipeline only creates **drafts**. An admin approves before anything reaches students.

### 3.9 Notifications & Support
- **Functions:** alert students when a saved programme's requirements change; announce result release dates; contact support; report wrong data.
- **Owns:** `SUPPORT_TICKET`. `NOTIFICATION` is a technical table, left out of the documentation ERD.

### 3.10 Administration
- **Functions:** manage institutions and programmes; manage requirements and merit formulas; review and publish pipeline drafts; manage admin accounts; view the audit log.
- **Institution first (planned):** an institution is added with its official sources (website, programme page, prospectus PDFs, ePanduan university code). The content pipeline reads its programmes from those sources and shows "programmes found" (new, changed, missing) for an admin to accept as drafts; another admin publishes. Programmes no longer listed are flagged, never archived automatically. Adding a programme by hand remains a fallback.
- **Notes:** all admin changes are versioned (`version_no`, `review_status`, `approved_by`). The audit log is a technical table and is left out of the documentation ERD.
- **Maker-checker (four eyes) for programmes:** any admin may prepare a change and becomes its preparer; an admin other than the preparer approves it. A new programme goes draft → review → published (it can be withdrawn from review to edit, or returned with a reason). A published programme is edited through a **pending change**: students keep the published details until another admin approves the change (like a "changed" entry in a headless CMS). Institution and level can change only before the first publication. Submitted work goes to the task inbox of every other admin (no named reviewer); any of them may approve or return it. A programme can be deleted only as a draft or once archived, never while students can see it or while it is in review.
- **Designed for non-technical admins** (most admins are not IT staff, so the console must teach itself):
  - *Task-first home:* "What do you want to do today?" with three main tasks (review drafts, update requirements, answer student reports) and a list of less common tasks.
  - *Wizards:* long jobs are split into numbered steps with autosave (for example, update requirements: choose programme → show source → write rules → review and submit).
  - *Sentence builder for rules:* "Students need at least [B ▾] in [Mathematics ▾]" and "at least C in ONE OF: …" instead of AND/OR logic. A "paste prospectus text" option drafts the rules for the admin to check.
  - *Help in place:* a "Help for this screen" panel (steps, terms, "Show me"), underlined terms with tooltips, and a short video. No manual needed.
  - *Practice mode:* a sandbox with sample data and short missions. Nothing is saved or shown to students. Only in practice mode can an admin approve their own draft.
- **Super admin (demo and one-person team):** still the admin role (no third role for routing); `app_metadata.super_admin = true`, which only the service key can set. The gateway passes it to services as an internal header built per request (a header sent by a browser is ignored). A super admin may approve their own programme, change, requirement draft or institution delete; the approval is recorded with their id, so `prepared_by = approved_by` shows a self-approval. Returning one's own work is not offered. The local seeder creates one demo super admin; production should keep the two-admin rule.
  - *Safety:* undo toasts, impact shown in numbers before publishing ("23 students will change to Not eligible"), errors that say how to fix, and empty states that suggest the next step.
  - *Plain words:* Konflik → Sumber bercanggah, Lapuk → Perlu semak semula, Tidak tersedia → Tiada sumber, Ringkasan → Laman utama.
  - Practice mode needs a separate sandbox schema with seeded sample data, reset on demand. Plan it with the admin catalogue work (roadmap, Sprint 2), and treat it as *Should have*.

---

## 4. Main data flows

### 4.1 Student gets a recommendation
1. Student confirms results (manual or from a slip).
2. Eligibility engine checks every published requirement for the student's level.
3. Scoring ranks eligible and almost-eligible programmes.
4. Prediction adds an offer-chance band where data exists.
5. Results are stored in `RECOMMENDATION` with reasons, then shown on the dashboard card and the recommendation page.
6. Scores are recomputed only when the profile, interests or published requirements change.

### 4.2 Requirement changes at a university
1. Weekly crawl fetches the official page and compares its checksum.
2. If it changed, the extractor produces a draft requirement with quoted evidence.
3. Validation checks the draft (known subjects, valid grades, sensible numbers).
4. Admin reviews a side-by-side diff and publishes.
5. Students who saved the programme receive a notification; their recommendations are recomputed.

### 4.3 Student does not qualify yet
1. Eligibility finds fewer than five eligible programmes at the target level.
2. The system looks for, in this order: programmes at a lower level the student can apply for now (certificate, skills); stepping-stone pathways from those programmes to the target level; the one or two grade improvements that open the most programmes; programmes the student almost qualifies for.
3. Every option is still ranked by interest fit, so a creative student sees creative pathways.
4. The page uses supportive wording ("Not yet eligible for this diploma — here are three ways to get there"). The system does not suggest applying to programmes whose minimum requirements are clearly not met. Official routes that allow it, such as interviews or APEL for adult learners, are shown with the label "You can try — subject to the institution's decision".

### 4.4 Slip upload
1. Student uploads a PDF or photo (under-18 students tick the parental consent box).
2. Worker runs OCR locally and maps text to subjects and grades with a confidence score.
3. Student sees every row: confident rows are filled in, unsure rows are highlighted with a reason.
4. Student fixes the highlighted rows and confirms. The original file is deleted unless the student keeps it.

---

## 5. API outline

REST over HTTPS, JSON. All student routes require a session; admin routes require `role = admin`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup`, `/api/auth/login` | Account (Supabase Auth) |
| GET/PUT | `/api/me` | Profile and education level |
| POST | `/api/records` | Create an academic record (manual) |
| POST | `/api/records/upload` | Upload a slip; returns a review draft |
| PUT | `/api/records/{id}/confirm` | Confirm reviewed grades |
| GET | `/api/programs?university=&field=&level=` | Search catalogue |
| GET | `/api/programs/{id}` | Programme details and requirements |
| GET | `/api/eligibility/{programId}` | Eligibility result with failed rules |
| GET | `/api/recommendations` | Ranked list with reasons and offer chance; includes alternative pathways when needed |
| GET | `/api/eligibility/what-if?subject=&grade=` | Programmes that would open if one grade improved |
| POST | `/api/assistant/ask` | Question answered from sources (no visible quota; silent per-minute fair-use guard) |
| GET/POST | `/api/roadmaps` | Roadmaps and steps |
| GET | `/api/admin/drafts` | Pipeline drafts waiting for review |
| POST | `/api/admin/drafts/{id}/publish` | Publish a reviewed draft |
| CRUD | `/api/admin/programs`, `/api/admin/requirements`, `/api/admin/merit-formulas` | Catalogue management |

---

## 6. Security and privacy

- Row-level security in Postgres: a student can only read and write their own records.
- Documents stored in a private bucket; signed URLs that expire after a few minutes.
- Personal data stays out of free AI tiers (see the cost plan).
- Input validation on every route; abuse protection on upload and assistant routes (per-minute throttle only — students see no daily quota).
- Admin actions written to the audit log.
- PDPA: consent records, data export, and account deletion that removes records and files.

---

## 7. Testing and evaluation

| What | How | Target |
|---|---|---|
| Eligibility rules | Unit tests per rule type, plus 20 real programme cases checked by hand | 100% pass |
| OCR + mapping | 30 sample slips with known answers | ≥ 95% of rows correct before review; 100% after review |
| Content extraction | Golden set of 30 programme pages checked manually | ≥ 90% field accuracy in drafts; 100% after admin review |
| Recommendation quality | User test with 10–15 students: "Are the top 5 sensible?" | ≥ 70% rate the list as useful |
| Prediction | Back-test: train on earlier years, predict the latest year | Band correct for ≥ 70% where data exists |
| UI flows | Playwright end-to-end tests for sign-up, upload, recommendation, admin publish | Pass on every merge |

---

## 8. What to revisit as the system grows

- Replace margin-based prediction with a trained model once three or more years of cut-off data exist for most programmes.
- Move from GitHub Actions cron to a small queue if crawls become frequent.
- Consider a native app (Expo) only if push notifications or offline use become essential.
- Add more institutions once the admin review flow is fast enough.
