# EduLaunch — Roadmap

Version 3.1 · 27 Oct 2026 · current position: **end of Sprint 4** (Step 8 built, M1 demo after its manual check; next: JPT import)

**Assumptions:** final-year project over two semesters (about 28 weeks), one to three developers, two-week sprints. Capacity split: about 70% features, 20% testing and clean-up, 10% buffer for surprises.

**Guiding rules (every step must keep these):**
1. Students see only data an admin approved, from official Malaysian sources.
2. AI prepares drafts; a person approves. No LLM writes a student's eligibility, roadmap or careers on the spot.
3. Every requirement, career and pathway shows its source and year.
4. No salary, offer or job guarantee without an official source.
5. Small steps: unit tests first, then a manual check.

**Status labels:** **Done** = built and tested · **In Progress** = part built (usually the back end exists, the screens do not) · **Not Started**.

---

## Status overview

- **Done:** 8 of 31 items. Project setup, CI on GitHub, Bahasa Melayu / English, accounts, the academic profile, programme search, the eligibility engine, and the admin catalogue (Steps 1–7 checked by hand; Step 8 waiting for its check).
- **In Progress:** 7 items. Back-end services exist with unit and integration tests; their screens and real programme data do not yet.
- **Not Started:** 16 items.
- **At risk:** real catalogue data and historical admission data. Both are planned through the JPT import (Steps 9 and 11), which first needs the ePanduan terms of use checked.

### Work steps so far

We build in small steps. Each step has unit tests first, then a manual check in [testing/manual-checklist.md](testing/manual-checklist.md).

| Step | What | Status |
|---|---|---|
| 1 | Project setup, one-command bootstrap, CI | **Done** |
| 2 | Integration tests for every service's database code | **Done** |
| 3 | Sample catalogue (3 institutions, 14 programmes, marked "Contoh") and `pnpm db:seed` | **Done** (checked by hand) |
| 4 | Student portal layout, programme directory and programme page, in BM and EN | **Done** (checked by hand) |
| 5 | Accounts: sign up, log in, forgot password, onboarding (education level), log out; every portal page now needs an account; sidebar works on phones and can be collapsed; admins and students kept to their own pages; e-mails in the EduLaunch design | **Done** (checked by hand) |
| 6 | Academic profile: results form per level (school grades, SPM targets, actual SPM), add/remove subjects, save & confirm; profile page with level change | **Done** (checked by hand) |
| 6b | Pre-university and Diploma: qualification type, CGPA, MUET, diploma field, STPM/A-Level grades, basic SPM tab; searchable subjects, typed subjects, school results per year, saved records | **Done** (checked by hand) |
| 7 | Eligibility on screen: "Can I get in?" on the programme page, by entry route (SPM, certificate, STPM, matriculation, diploma), each requirement explained in BM/EN | **Done** (checked by hand) |
| 8 | Admin console: home with today's tasks, task inbox, institutions, programmes (draft → another admin approves → published), requirement wizard by entry route (including SVM, SKM, DVM and DKM routes) with a second-admin review | **Done** (manual check waiting); **M1 demo** after the check |
| 9 | **Programmes found from each institution (institution first):** an admin adds an institution with its official sources (website, programme page, prospectus PDFs, its ePanduan university code) → the system reads that institution's programmes (code, name, level, NEC field, duration, year, merit average) → a "programmes found" list for that institution, which an admin accepts (in bulk) as drafts → another admin publishes. Merit averages go to `ADMISSION_STAT`; the 157 NEC codes become the field list. Weekly re-check: new programmes are offered, missing ones are flagged (never archived automatically). Adding a programme by hand stays as a fallback. Reading ePanduan starts only after its terms of use are checked | Planned (next) |
| 10 | **Requirement model v2:** general requirements per university and route (Syarat Am), alternative sets (Pilihan A / B), "N credits from a list of subjects", diploma field by NEC code, A-Level/IB points, conditions students confirm themselves, "use for other programmes" | Planned |
| 11 | **JPT import, part 2 (requirements):** read each programme's Syarat Am and Syarat Khas with a headless browser, parse with rules first and Claude for what rules cannot read, validate (exact quotes, known subjects, valid grades), create requirement drafts that an admin approves | Planned |
| 12 | Public website from Figma: landing, how it works, about, contact, guide/FAQ, privacy and terms | Planned |
| 13 | **Career data and study roadmap:** careers with MASCO code, qualification level and source; after-Diploma branches (work now, degree, professional qualification, work first); "being prepared" state and data-gap tasks; AI drafts for missing fields from whitelisted Malaysian sources, approved by admins | Planned |

### Changes since v3 (institution-first programme import, 27 Oct 2026)

| Change | Why |
|---|---|
| Programmes are found **from each institution**: add the institution and its official sources first, then the system reads the programmes it offers | Owner's flow: typing every programme by hand is slow; an institution's own sources say what it offers |
| The institution form gets **official sources**: website, programme page, prospectus PDFs and its ePanduan university code | One place per institution for where its data comes from |
| A **"programmes found"** list per institution: an admin accepts many at once as drafts; another admin publishes | Same two-admin rule; no programme reaches students without people checking it |
| Weekly re-check: new programmes are offered for review; programmes no longer listed are **flagged**, never archived automatically | A missing page can be a site error, not a closed programme |
| "Add programme" by hand stays | For institutions whose sources cannot be read automatically |

### Changes since v3 (career data planned, 27 Oct 2026)

| Change | Why |
|---|---|
| **Guiding rules** added at the top of this roadmap | Keeps every step on target: verified Malaysian data, AI drafts and people approve, sources shown |
| New **Step 13: career data and study roadmap**, after the JPT import | Branch "continue to a degree" needs real programmes and requirements first |
| Careers get a **MASCO 2020 code**, qualification level (MQF) and source; fields use NEC codes | Careers must match Malaysian job classes and qualification levels |
| When a field has no career data: "being prepared" for the student, a data-gap task for admins, AI drafts from **whitelisted Malaysian sources** (MASCO, MyCOL, MQA, professional bodies, JPT), admin approval | A live AI answer could invent jobs or use other countries' routes |
| Salaries stay hidden until an official source exists (for example KESUMA's starting-salary guidelines by MASCO category) | No guesses about pay |

### Changes since v3 (JPT import planned, 27 Oct 2026)

| Change | Why |
|---|---|
| **Programme data from the JPT ePanduan site** becomes the next work (Steps 9 and 11), before the public website (now Step 12) | Typing real requirements by hand for many programmes is too slow; real catalogue data was the biggest risk |
| Step 9 imports the programme list and **merit averages** first; requirements follow in Step 11 | The list pages are plain server pages and easy to read; merit averages unblock offer-chance prediction (`ADMISSION_STAT`) |
| **Requirement model v2** (Step 10) comes before importing requirements | Real requirement documents use general requirements per university, alternative sets (A or B), "2 credits from this list", diploma fields by NEC code and conditions the system cannot check; the importer needs a place to store them |
| Claude (Anthropic API) is allowed for extracting **public** requirement text | Owner's decision. Personal data still never goes to an AI provider without no-training terms |
| Nothing imported is published automatically: the importer prepares drafts as a "Pembantu JPT" account and an admin approves them | Same two-admin rule as Step 8 |
| **Gate:** the importer runs only after the ePanduan terms of use are checked (and, ideally, JPT agrees). If not allowed: university prospectus PDFs with AI extraction, and manual entry | We do not bypass logins, CAPTCHAs, rate limits or terms |
| Interest test and activities move one sprint later | Capacity goes to real data first |

### Changes since v3 (Step 8, 27 Oct 2026)

| Change | Why |
|---|---|
| Admin console built: home with today's tasks, task inbox (for me / returned / my drafts / waiting), institutions, programmes, requirement wizard and review screen | Step 8; follows Figma Admin v2 (A1, A5, B1, B2, B3) |
| Programmes now go through the same two-admin rule as requirements: draft → another admin approves → students see it; published programmes can be archived | Nobody publishes their own work |
| Requirements are written as sentences ("Pelajar perlu minimum B dalam Matematik", "SALAH SATU daripada"), each with the sentence from the source and a link to the official source; a new version starts from the published rules | Admins are mostly not IT people |
| New entry routes **SVM, SKM, DVM and DKM**; a student uses their own route first, then the closest general one (SVM → certificate → SPM, DVM/DKM → diploma) | Certificate and DVM/DKM holders were checked against the wrong route |
| Not in Step 8: training mode, guided tour, help search, audit trail screen, and mapping subjects or fields that students typed themselves | Kept for later steps so Step 8 stays testable |

### Changes since v3 (levels revised, 26 Oct 2026)

| Change | Why |
|---|---|
| New level **after certificate** (Sijil Politeknik / Kolej Komuniti, SVM, SKM 1–3); target studies: diploma, DKM/DLKM | These students continue to a diploma; they were missing |
| **Pre-university and diploma merged** into one level, with the qualification chosen in a dialog: STPM, matriculation, foundation, A-Level, diploma, DVM, DKM/DLKM | All lead to a degree and are judged on CGPA, MUET and (for diplomas) a related field |
| Record rules cover five stages: certificate → diploma keeps the certificate; moving down or switching within a stage deletes what no longer fits, after confirming | Matching must not use results entered by mistake |
| Admin entry routes (Step 8) and the catalogue need certificate, SVM, SKM, DVM and DKM routes | Requirements are stored per entry route |
| Matriculation records its **stream** (Science modules I–III, Engineering, Accounting, Professional Accounting) with subject grades; foundation records its **field and programme** with optional subject grades | Degree programmes check related fields and specific grades (e.g. B in Biology); both feed degree recommendations |
| Figma onboarding, level dialog and certificate form to be updated | The design still shows the old five levels |

### Changes since v3 (Step 6)

| Change | Why |
|---|---|
| Results form and profile page done | Step 6 |
| **Step 6b** done: diploma and pre-university students record what degree programmes actually check (CGPA, MUET, diploma field, STPM/A-Level grades) plus basic SPM | Researched from public university entry requirements |
| Subjects: searchable system dropdown, 83 official subjects, students can add an unlisted subject by name | Students take subjects such as Bahasa Arab or Tasawwuf |
| Records kept per year and listed as history | A Form 1 student's results stay when they move to Form 4 |
| Level changes: moving up keeps records; moving down or switching qualification deletes the records that no longer fit, after the student confirms in a dialog; the qualification after SPM is asked once and only its form is shown | Matching must not use results entered by mistake |
| Slip upload button from Figma not shown yet | OCR is a later item (Slip upload + OCR); no button that does nothing |

### Changes since v3 (Step 5)

| Change | Why |
|---|---|
| **Accounts** screens done: sign up, log in, forgot password, new password, onboarding | Step 5 |
| Every portal page needs an account; only the account pages are public | Matches the Figma design: the sidebar is the private portal, the public website is separate |
| Sidebar works on phones (menu button) and can be shrunk to icons on desktop | Found during review: the portal was not responsive |
| New **Step 9: public website** | The landing and information pages from Figma are not built yet |
| `pnpm admin:grant <email>` | Teammates can test the admin console locally |

### Changes in this update (v2 → v3)

| Change | Why |
|---|---|
| **CI on GitHub** done; integration tests for all services | Every push is now checked automatically |
| **Seed catalogue** started with clearly marked sample data | Screens and demos needed data now; real data from official sources still to do |
| **Programme search** screens done (directory, filters, programme page with requirements) | Step 4 |
| **Bahasa Melayu / English** moved from "Could have" to **Done** | Team decision: the whole system is bilingual from the start, so every new screen ships in both languages |
| Programme cards show information only, no pictures | Admins should not have to upload a picture for every programme |
| Services keep running when RabbitMQ is down | Found during manual testing |
| Recommendation reasons become data the web app translates | **Done for the eligibility check** (Step 7); the recommendations list still uses English reasons until its screen is built |

### Changes in the previous update (v1 → v2)

| Change | Why |
|---|---|
| Architecture is now **five services behind an API gateway** instead of one Next.js app | Team decision; see [architecture.md](architecture.md) |
| Data isolation uses **one Postgres schema and role per service** instead of row-level security on shared tables | Fits the service split; tested |
| Sprint 1 marked done; several Sprint 2–9 back-end items started early | Built during setup |
| New items: **CI on GitHub**, **staging deployment**, **API documentation page** | Needed for a team of several people and for the demo |
| New risks: service complexity, free hosting limits | Came with the architecture choice |
| Seed catalogue moved to the top of Sprint 2 | Every screen and demo depends on it |

---

## 1. Now / Next / Later

### Now — foundation and core value (Weeks 1–8)
| Item | Outcome | Status | What is left |
|---|---|---|---|
| Project setup | Monorepo, five services + gateway, local Supabase in Docker, one-command bootstrap, unit tests | **Done** | — |
| CI on GitHub | Build, type-check and tests on every pull request | **Done** | — |
| Bahasa Melayu / English | Every screen and catalogue name in both languages, `/ms` and `/en` addresses, remembered choice | **Done** | Keep adding both languages for each new screen |
| Data model | Tables from the ERD in each service's schema, migrations | **In Progress** | Storage bucket for slips |
| Seed catalogue | 5 universities, 30–50 programmes, Form 4 streams, a few certificate and skills programmes; requirements entered by hand and checked | **In Progress** | Real data from official sources through the JPT import (Steps 9 and 11); seed script and 14 sample programmes are done |
| Accounts | Sign up, log in, reset password, choose education level | **Done** | — |
| Academic profile (manual) | Subjects from the catalogue, add/remove, grade validation | **Done** | — |
| Programme search | University + field comboboxes, programme details | **Done** | — |
| Eligibility engine | Eligible / almost / not yet, with the reason for each rule | **Done** | — |
| Admin catalogue | Create and edit institutions, programmes, requirements (draft → second-admin approval → publish) | **Done** (manual check waiting) | Map subjects and fields that students type themselves to the catalogue (moved to Next) |

**Milestone M1 (Week 8):** a student can enter SPM results and see which seeded programmes they qualify for. An admin can edit and publish a programme.

### Next — intelligence (Weeks 9–18)
| Item | Outcome | Status | What is left |
|---|---|---|---|
| Programmes from each institution | Institution → its official sources → its programmes found automatically (ePanduan by university, its own site or prospectus) → admin accepts → published; merit averages into `ADMISSION_STAT` | Not Started | Sources on the institution form; terms check; parser with saved pages as test fixtures; "programmes found" review list; weekly re-check (Step 9) |
| Requirement model v2 | Syarat Am, alternative sets, credits from a list, NEC field rules, self-confirmed conditions, copy to other programmes | Not Started | Step 10 |
| JPT import (requirements) | Requirement text parsed by rules, Claude for the rest, validated, drafts for admin approval | Not Started | Step 11; needs Steps 9–10 and an Anthropic API key |
| Interest test + activities | RIASEC result, activity ratings | Not Started | Questions, scoring, screens (tables exist) |
| Recommendation v1 | Score, rank, template reasons, top-match card | **In Progress** | Dashboard card; interest and preference data feeding the score |
| Merit calculator | Formula per entry route, target vs actual labels | Not Started | |
| Slip upload + OCR | Upload, local OCR, review screen with flagged rows | Not Started | |
| Prediction v1 | Margin bands from `ADMISSION_STAT`, "No data" state | **In Progress** | Merit averages from the JPT import (Step 9); endpoint (estimator logic is done) |
| Alternative pathways | Certificate/skills programmes, stepping-stone pathways, what-if "improve a result", supportive wording | Not Started | Pathway table exists |
| Study roadmap | Roadmap per level: Form 1–3 stream suggestion, after-Diploma branches (work now, degree, professional qualification, work first) with careers | Not Started | Step 13: MASCO codes and sources in `CAREER`; data-gap tasks; AI gap filling from whitelisted Malaysian sources; screens (tables exist) |
| Notifications | Requirement change alerts, result-release prompts | **In Progress** | Result-release prompts; screens (change alerts are done) |
| All education levels | Form 1–3, Form 4–5, after SPM, after certificate (Sijil/SVM/SKM), after pre-university or diploma (STPM, matriculation, foundation, A-Level, diploma, DVM, DKM) | **In Progress** | Results forms per level are done; dashboards and recommendations per level still to do |
| Staging deployment | The whole system online for supervisors and testers | Not Started | Choose free hosting; production compose file; deployment guide |

**Milestone M2 (Week 18):** end-to-end demo for every education level: upload a slip, get explained recommendations with offer chances, save a roadmap.

### Later — automation and polish (Weeks 19–28)
| Item | Outcome | Status | What is left |
|---|---|---|---|
| Content pipeline | Source list, weekly crawl, checksum change detection | **In Progress** | ePanduan adapter moved to Next (Steps 9 and 11); weekly schedule; PDF reading for university prospectuses (source registration and change detection are done) |
| AI extraction | Drafts with quotes, validation, admin diff review | Not Started | First used for JPT requirement text (Step 11); then prospectus PDFs. Admin review screen is done (Step 8) |
| Ask AI (RAG) | Embedded chunks, cited answers, no visible quota (silent fair-use guard) | Not Started | Chunk table exists |
| PWA | Installable mobile app from the same codebase | Not Started | |
| Prediction v2 | Logistic regression if 3+ years of data exist | Not Started | |
| Evaluation | Golden sets, back-test, user test with 10–15 students | Not Started | |
| Hardening | Accessibility, performance, security review, backups | Not Started | |
| Write-up and demo | Report, slides, recorded demo | Not Started | |

**Milestone M3 (Week 24):** feature freeze. **M4 (Week 28):** final demo and report.

---

## 2. Sprint plan (two-week sprints)

| Sprint | Weeks | Goal | Status |
|---|---|---|---|
| 1 | 1–2 | Setup, database schema, auth, service skeletons | **Done** (plus early back end for Sprints 2–9) |
| 2 | 3–4 | **Seed catalogue**; CI; programme search and detail screens; BM/EN | **Done** except real catalogue data (still at risk) |
| 3 | 5–6 | Sign-in screens; academic profile screens with subject picker | **Done** (Steps 5–6) |
| 4 | 7–8 | Eligibility on screen with real data; admin programme editing; requirement review screens; **M1 demo** | **Done** (Steps 7–8); M1 demo after the Step 8 check |
| 5 | 9–10 | **JPT import part 1** (programme list, NEC fields, merit averages); requirement model v2 | Next |
| 6 | 11–12 | **JPT import part 2** (requirements, Claude extraction); recommendation dashboard card | |
| 7 | 13–14 | Interest test and activities; merit calculator | |
| 8 | 15–16 | Prediction v1 with JPT merit data; slip upload and OCR; alternative pathways + what-if | |
| 9 | 17–18 | All education levels; roadmap and notifications screens; staging deployment; public website; **M2 demo** | |
| 10 | 19–20 | Content pipeline: prospectus PDFs, weekly schedule for every source | |
| 11 | 21–22 | AI extraction for PDFs; golden-set accuracy check | |
| 12 | 23–24 | Ask AI (RAG); PWA; **M3 feature freeze** | |
| 13 | 25–26 | Evaluation, user test, fixes | |
| 14 | 27–28 | Report, demo, buffer; **M4 final** | |

---

## 3. Priorities (MoSCoW)

| Must have | Should have | Could have | Won't have (this project) |
|---|---|---|---|
| Accounts (student, admin) | Slip upload + OCR | Prediction v2 (logistic regression) | Parent, guardian or counsellor accounts |
| Academic profile with subject add/remove | Prediction v1 | Ask AI (RAG) | Native iOS / Android apps |
| Programme search | Interest test + activities | Content pipeline automation | Payments or applications on behalf of students |
| Eligibility engine | Study roadmap | PWA install | Self-hosted cloud GPU |
| Recommendation with reasons | Notifications | API documentation page (Swagger) | Coverage of every institution in Malaysia |
| Admin catalogue with draft → publish | Merit calculator | | |
| Seed catalogue | Alternative pathways for students who do not qualify yet | | |
| Plain-language admin console: task-first home, step-by-step wizards, help on each screen | Admin practice mode (sandbox with sample data and missions) | | |
| CI on GitHub | Staging deployment | | |
| Bahasa Melayu and English for every screen | | | |

---

## 4. Dependencies

| Item | Depends on | Risk if late |
|---|---|---|
| Real decisions by students | Real catalogue data from official sources (JPT import, Steps 9 and 11) | Sample data must stay clearly marked "Contoh" |
| JPT import | ePanduan terms of use allow automated reading (or JPT agrees); the site's page layout | Fall back to prospectus PDFs with AI extraction and manual entry |
| Study roadmap (Step 13) | JPT import (degree branch), NEC field codes, career data from MASCO and other whitelisted sources | Branches show "being prepared"; students are not given unverified careers |
| Recommendation | Eligibility engine (done), interest test, seed catalogue | No core demo |
| Alternative pathways | Certificate/skills programmes and pathways in the catalogue | Students with weak results see only "almost eligible" options |
| Prediction | Merit averages from ePanduan (`ADMISSION_STAT`) | Show "No data"; do not block the release |
| Slip OCR | Sample slips for testing (with consent, personal details removed) | Manual entry stays available |
| AI extraction | Content pipeline; an Anthropic API key (public text only) | Admin keeps entering data by hand |
| Ask AI | Published content chunks and embeddings | Feature hidden until ready |
| Staging deployment | Hosting decision (free VM vs free platform tiers) | Demo only on a laptop |

---

## 5. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Scope too large for two semesters | High | Keep "Could have" items out until M2 is done |
| Missing historical admission data | High | Prediction shows data coverage; focus demo on programmes with data |
| Free hosting limits (sleeping services, monthly hour caps) | High | Run all services on one free VM, or wake services before demos; decide by Sprint 8 |
| Five services are harder to run and debug than one app | Medium | Shared packages, one bootstrap command, health checks, keep to five services |
| Teammates' machines differ (Windows/Mac) | Medium | `pnpm doctor` checks tools; setup guide covers both |
| Free AI tier changes | Medium | Provider-agnostic AI client; local model fallback |
| Wrong requirement data | Medium | Admin approval, quotes as evidence, golden-set checks |
| ePanduan terms do not allow automated reading | Medium | Check before Step 9; ask JPT through the supervisor; fall back to prospectus PDFs |
| AI career drafts that do not fit Malaysia | Medium | Whitelisted Malaysian sources, MASCO and MQF checks, quotes, admin approval |
| ePanduan changes its page layout | Medium | Parser reads labels, not positions; a run that finds no programmes stops and alerts instead of wiping data; saved pages as test fixtures |
| A screen ships in one language only | Low | Tests check both dictionaries have the same keys; guideline in CONTRIBUTING |
| Team availability around exams | Medium | 10% buffer; milestones before exam weeks |

---

## 6. Success measures for the final report

- A student completes onboarding and sees recommendations in under 5 minutes.
- At least 95% of slip rows read correctly before review.
- At least 90% of extracted requirement fields correct before admin review.
- At least 70% of tested students rate their top 5 recommendations as useful.
- Running cost stays at RM0 per month during development.
