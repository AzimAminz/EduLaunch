# EduLaunch — Roadmap

Version 1 · 25 Oct 2026

**Assumptions:** final-year project over two semesters (about 28 weeks), one to three developers, two-week sprints. Capacity split: about 70% features, 20% testing and clean-up, 10% buffer for surprises.

---

## 1. Now / Next / Later

### Now — foundation and core value (Weeks 1–8)
| Item | Outcome | Status |
|---|---|---|
| Project setup | Next.js app, Supabase project, CI with tests, environments | Not Started |
| Data model | Tables from the ERD, row-level security, seed data | Not Started |
| Seed catalogue | 5 universities, 30–50 programmes, plus a few certificate and skills programmes; requirements entered by hand and checked | Not Started |
| Accounts | Sign up, log in, reset password, choose education level | Not Started |
| Academic profile (manual) | Subjects from the catalogue, add/remove, grade validation | Not Started |
| Programme search | University + field comboboxes, programme details | Not Started |
| Eligibility engine | Eligible / almost / not yet, with the failed rule | Not Started |
| Admin catalogue | Create and edit institutions, programmes, requirements (draft → publish) | Not Started |

**Milestone M1 (Week 8):** a student can enter SPM results and see which seeded programmes they qualify for. An admin can edit and publish a programme.

### Next — intelligence (Weeks 9–18)
| Item | Outcome | Status |
|---|---|---|
| Interest test + activities | RIASEC result, activity ratings | Not Started |
| Recommendation v1 | Score, rank, template reasons, top-match card | Not Started |
| Merit calculator | Formula per entry route, target vs actual labels | Not Started |
| Slip upload + OCR | Upload, local OCR, review screen with flagged rows | Not Started |
| Prediction v1 | Margin bands from `ADMISSION_STAT`, "No data" state | Not Started |
| Alternative pathways | Certificate/skills programmes, stepping-stone pathways, what-if "improve a result", supportive wording | Not Started |
| Study roadmap | Build steps, branches, next actions; roadmap per level: Form 1–3 stream suggestion, after-Diploma "work now or continue" with careers | Not Started |
| Notifications | Requirement change alerts, result-release prompts | Not Started |
| All education levels | Form 1–3, Form 4–5, after SPM, after STPM/Matric/Foundation/A-Level, after Diploma | Not Started |

**Milestone M2 (Week 18):** end-to-end demo for every education level: upload a slip, get explained recommendations with offer chances, save a roadmap.

### Later — automation and polish (Weeks 19–28)
| Item | Outcome | Status |
|---|---|---|
| Content pipeline | Source list, weekly crawl, checksum change detection | Not Started |
| AI extraction | Drafts with quotes, validation, admin diff review | Not Started |
| Ask AI (RAG) | Embedded chunks, cited answers, no visible quota (silent fair-use guard) | Not Started |
| PWA | Installable mobile app from the same codebase | Not Started |
| Prediction v2 | Logistic regression if 3+ years of data exist | Not Started |
| Evaluation | Golden sets, back-test, user test with 10–15 students | Not Started |
| Hardening | Accessibility, performance, security review, backups | Not Started |
| Write-up and demo | Report, slides, recorded demo | Not Started |

**Milestone M3 (Week 24):** feature freeze. **M4 (Week 28):** final demo and report.

---

## 2. Sprint plan (two-week sprints)

| Sprint | Weeks | Goal |
|---|---|---|
| 1 | 1–2 | Setup, database schema, auth, seed script |
| 2 | 3–4 | Catalogue search and programme details; admin CRUD |
| 3 | 5–6 | Academic profile (manual) with subject picker; grade scales |
| 4 | 7–8 | Eligibility engine + tests; **M1 demo** |
| 5 | 9–10 | Interest test and activities |
| 6 | 11–12 | Recommendation v1 + dashboard card; merit calculator |
| 7 | 13–14 | Slip upload, OCR, review screen |
| 8 | 15–16 | Prediction v1; alternative pathways + what-if; all education levels |
| 9 | 17–18 | Roadmap and notifications; **M2 demo** |
| 10 | 19–20 | Content pipeline: sources, crawl, change detection |
| 11 | 21–22 | AI extraction drafts + admin diff review |
| 12 | 23–24 | Ask AI (RAG); PWA; **M3 feature freeze** |
| 13 | 25–26 | Evaluation, user test, fixes |
| 14 | 27–28 | Report, demo, buffer; **M4 final** |

---

## 3. Priorities (MoSCoW)

| Must have | Should have | Could have | Won't have (this project) |
|---|---|---|---|
| Accounts (student, admin) | Slip upload + OCR | Prediction v2 (logistic regression) | Parent, guardian or counsellor accounts |
| Academic profile with subject add/remove | Prediction v1 | Ask AI (RAG) | Native iOS / Android apps |
| Programme search | Interest test + activities | Content pipeline automation | Payments or applications on behalf of students |
| Eligibility engine | Study roadmap | PWA install | Self-hosted cloud GPU |
| Recommendation with reasons | Notifications | English / Malay switch | Coverage of every institution in Malaysia |
| Admin catalogue with draft → publish | Merit calculator | | |
| | Alternative pathways for students who do not qualify yet | | |
| Plain-language admin console: task-first home, step-by-step wizards, help on each screen | Admin practice mode (sandbox with sample data and missions) | | |

---

## 4. Dependencies

| Item | Depends on | Risk if late |
|---|---|---|
| Recommendation | Eligibility engine, interest test, seed catalogue | No core demo |
| Alternative pathways | Certificate/skills programmes and pathways in the catalogue | Students with weak results see only "almost eligible" options |
| Prediction | Historical cut-off data (`ADMISSION_STAT`) | Show "No data"; do not block the release |
| Slip OCR | Sample slips for testing (with consent, personal details removed) | Manual entry stays available |
| AI extraction | Content pipeline; access to a free LLM tier or local model | Admin keeps entering data by hand |
| Ask AI | Published content chunks and embeddings | Feature hidden until ready |

---

## 5. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Scope too large for two semesters | High | Keep "Could have" items out until M2 is done |
| Missing historical admission data | High | Prediction shows data coverage; focus demo on programmes with data |
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
