# EduLaunch — Roadmap

Version 2 · 26 Oct 2026 · current position: **end of Sprint 1**

**Assumptions:** final-year project over two semesters (about 28 weeks), one to three developers, two-week sprints. Capacity split: about 70% features, 20% testing and clean-up, 10% buffer for surprises.

**Status labels:** **Done** = built and tested · **In Progress** = part built (usually the back end exists, the screens do not) · **Not Started**.

---

## Status overview

- **Done:** 2 of 27 items. Project setup (with one-command local setup) and the eligibility engine.
- **In Progress:** 10 items. Most back-end services exist with tests; the screens and real programme data do not yet.
- **Not Started:** 15 items.
- **At risk:** seed catalogue (blocks every demo) and historical admission data (blocks real offer chances).

### Changes in this update (v1 → v2)

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
| CI on GitHub | Build, type-check and tests on every pull request | Not Started | GitHub Actions workflow |
| Data model | Tables from the ERD in each service's schema, migrations | **In Progress** | Seed data; storage bucket for slips |
| Seed catalogue | 5 universities, 30–50 programmes, Form 4 streams, a few certificate and skills programmes; requirements entered by hand and checked | Not Started | Collect from official sources; seed script |
| Accounts | Sign up, log in, reset password, choose education level | **In Progress** | Sign-in screens (sessions and level API are done) |
| Academic profile (manual) | Subjects from the catalogue, add/remove, grade validation | **In Progress** | Screens (API with grade checks is done) |
| Programme search | University + field comboboxes, programme details | **In Progress** | Screens (search and detail API are done) |
| Eligibility engine | Eligible / almost / not yet, with the reason for each rule | **Done** | — |
| Admin catalogue | Create and edit institutions, programmes, requirements (draft → second-admin approval → publish) | **In Progress** | Programme/institution editing API; admin screens (requirement review workflow is done) |

**Milestone M1 (Week 8):** a student can enter SPM results and see which seeded programmes they qualify for. An admin can edit and publish a programme.

### Next — intelligence (Weeks 9–18)
| Item | Outcome | Status | What is left |
|---|---|---|---|
| Interest test + activities | RIASEC result, activity ratings | Not Started | Questions, scoring, screens (tables exist) |
| Recommendation v1 | Score, rank, template reasons, top-match card | **In Progress** | Dashboard card; interest and preference data feeding the score |
| Merit calculator | Formula per entry route, target vs actual labels | Not Started | |
| Slip upload + OCR | Upload, local OCR, review screen with flagged rows | Not Started | |
| Prediction v1 | Margin bands from `ADMISSION_STAT`, "No data" state | **In Progress** | Admission statistics data and endpoint (estimator logic is done) |
| Alternative pathways | Certificate/skills programmes, stepping-stone pathways, what-if "improve a result", supportive wording | Not Started | Pathway table exists |
| Study roadmap | Roadmap per level: Form 1–3 stream suggestion, after-Diploma "work now or continue" with careers | Not Started | Tables exist |
| Notifications | Requirement change alerts, result-release prompts | **In Progress** | Result-release prompts; screens (change alerts are done) |
| All education levels | Form 1–3, Form 4–5, after SPM, after STPM/Matric/Foundation/A-Level, after Diploma | **In Progress** | Screens per level (level rules and target levels are done) |
| Staging deployment | The whole system online for supervisors and testers | Not Started | Choose free hosting; production compose file; deployment guide |

**Milestone M2 (Week 18):** end-to-end demo for every education level: upload a slip, get explained recommendations with offer chances, save a roadmap.

### Later — automation and polish (Weeks 19–28)
| Item | Outcome | Status | What is left |
|---|---|---|---|
| Content pipeline | Source list, weekly crawl, checksum change detection | **In Progress** | Weekly schedule; PDF reading (source registration and change detection are done) |
| AI extraction | Drafts with quotes, validation, admin diff review | Not Started | |
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
| 2 | 3–4 | **Seed catalogue**; CI; programme search and detail screens; admin programme editing | Next |
| 3 | 5–6 | Sign-in screens; academic profile screens with subject picker | |
| 4 | 7–8 | Eligibility on screen with real data; requirement review screens; **M1 demo** | |
| 5 | 9–10 | Interest test and activities | |
| 6 | 11–12 | Recommendation dashboard card; merit calculator | |
| 7 | 13–14 | Slip upload, OCR, review screen | |
| 8 | 15–16 | Prediction v1 with admission data; alternative pathways + what-if; all education levels | |
| 9 | 17–18 | Roadmap and notifications screens; staging deployment; **M2 demo** | |
| 10 | 19–20 | Content pipeline: weekly schedule, PDF reading | |
| 11 | 21–22 | AI extraction drafts + admin diff review | |
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
| Recommendation with reasons | Notifications | English / Malay switch | Coverage of every institution in Malaysia |
| Admin catalogue with draft → publish | Merit calculator | API documentation page (Swagger) | |
| Seed catalogue | Alternative pathways for students who do not qualify yet | | |
| Plain-language admin console: task-first home, step-by-step wizards, help on each screen | Admin practice mode (sandbox with sample data and missions) | | |
| CI on GitHub | Staging deployment | | |

---

## 4. Dependencies

| Item | Depends on | Risk if late |
|---|---|---|
| Every screen and demo | Seed catalogue | Nothing meaningful to show |
| Recommendation | Eligibility engine (done), interest test, seed catalogue | No core demo |
| Alternative pathways | Certificate/skills programmes and pathways in the catalogue | Students with weak results see only "almost eligible" options |
| Prediction | Historical cut-off data (`ADMISSION_STAT`) | Show "No data"; do not block the release |
| Slip OCR | Sample slips for testing (with consent, personal details removed) | Manual entry stays available |
| AI extraction | Content pipeline; access to a free LLM tier or local model | Admin keeps entering data by hand |
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
| Team availability around exams | Medium | 10% buffer; milestones before exam weeks |

---

## 6. Success measures for the final report

- A student completes onboarding and sees recommendations in under 5 minutes.
- At least 95% of slip rows read correctly before review.
- At least 90% of extracted requirement fields correct before admin review.
- At least 70% of tested students rate their top 5 recommendations as useful.
- Running cost stays at RM0 per month during development.
