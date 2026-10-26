# EduLaunch — AI Design and Cost Plan

Version 1 · 25 Oct 2026

This document explains how EduLaunch recommends programmes, predicts offer chances, and collects content accurately, while keeping the running cost close to zero for a university project.

The main idea: **use AI only where it is clearly needed.** Most of the "smart" behaviour is rules, simple maths and good data. AI is used for reading messy documents and for answering questions.

---

## 1. Where AI is and is not used

| Feature | Approach | Uses an LLM? | Cost |
|---|---|---|---|
| Eligibility check | Rules in code | No | Free |
| Recommendation ranking | Scoring formula | No | Free |
| Recommendation reasons | Text templates filled with real data | No | Free |
| Alternative pathways and what-if | Same rules, re-run with one grade raised | No | Free |
| Offer-chance prediction | Margin vs past cut-offs, later logistic regression | No | Free |
| Form 4 stream suggestion | Score: 50% interest, 40% school-subject strength, 10% activity ratings (system-design §3.7) | No | Free |
| Careers after Diploma | `CAREER` lookup by field, sorted by interest fit; degrees checked by the eligibility engine | No (the student sees verified data only) | Free |
| Career and pathway data for fields with none yet | LLM drafts careers and pathways from official Malaysian sources; an admin approves (§5.9) | Yes, on public sources only, as a background job | Paid API, small; once per field |
| Slip / transcript reading | Local OCR (Tesseract or PaddleOCR) | Only for unsure rows, and only a local model | Free |
| Subject name matching | Alias table + fuzzy match | No | Free |
| Requirement extraction from official pages | LLM turns page text into a structured draft | Yes, on public pages only | Claude (§5.8) |
| Search and Q&A embeddings | Local multilingual embedding model | No (embedding model) | Free |
| "Ask AI" answers | Retrieval + LLM, answers must cite sources | Yes | Free tier, cached; local fallback |

---

## 2. Recommendation

### Step 1 — Filter
Only programmes the student can realistically aim for are scored:
- **Eligible:** passes every rule.
- **Almost eligible:** misses exactly one rule, and the gap is small (for example one grade step).
- Programmes for the wrong study level are skipped (a Form 2 student gets streams, not degrees).

### Step 2 — Score (0 to 100)

```
score = 45 × interest_fit
      + 30 × academic_strength
      + 15 × offer_chance
      + 10 × preference_signal
```

| Part | How it is calculated |
|---|---|
| `interest_fit` (0–1) | Cosine similarity between the student's RIASEC scores and the programme field's RIASEC weights. Activity ratings nudge the student's scores. |
| `academic_strength` (0–1) | Average normalised grade of the subjects that matter for the field (for example Mathematics and Physics for Engineering), using the grade scale's points. |
| `offer_chance` (0–1) | High = 1, Medium = 0.6, Low = 0.2, no data = 0.5 (neutral). |
| `preference_signal` (0–1) | Fields the student saved, compared, or searched for. |

The weights live in configuration so they can be tuned after user testing.

### Step 3 — Explain
Each recommendation stores its reasons, generated from templates, for example:

- "Physics A (target) — minimum B." (from the rule that passed)
- "Your interest profile (Investigative, Realistic) matches Engineering." (from `interest_fit`)
- "Chemistry is B now — still meets the minimum C." (attention note)

Templates are free, fast and never invent facts. An LLM may later rephrase them, but only from these stored facts.

### When it recalculates
Only when something changes: confirmed results, a finished interest test, a rated activity, or a newly published requirement. Results are cached in the `RECOMMENDATION` table, so the dashboard loads instantly.

---

## 3. When a student does not qualify yet

The system never shows an empty result, and it never encourages applying to programmes whose minimum requirements are clearly not met — those applications are usually rejected automatically.

### When it switches on
Fewer than five eligible programmes at the level the student is aiming for (for example, diplomas after SPM).

### What the student sees
Four kinds of options, each still ranked by interest fit:

| Option | What it shows | Example |
|---|---|---|
| **Apply now** | Programmes at a lower level whose requirements the student meets | A certificate at a community college; a skills (SKM) programme at a skills institute |
| **Stepping stone** | A path from that programme to the level they wanted, from `PROGRAM_PATHWAY` | Certificate in IT → Diploma in IT (with the CGPA it requires) → Degree in Computer Science |
| **Improve a result** | The one or two subjects that would open the most programmes, using the what-if simulation | "If Mathematics goes from D to C, 14 more programmes open." Shows how to resit the subject. |
| **Almost eligible** | Programmes missing one rule, with the gap | "Diploma in Accounting: needs a credit in Mathematics (you have D)." |

Official routes that do allow a try — interviews, or APEL for adult learners — appear with the label "You can try — subject to the institution's decision".

### Wording
Supportive and specific: "Not yet eligible for this diploma — here are three ways to get there." Never "You do not qualify" on its own.

### Cost
Zero. It reuses the eligibility rules, the what-if simulation and the scoring formula. No LLM is involved.

### Data it depends on
Certificate and skills programmes must be in the catalogue, and pathways must be entered from official sources. Requirements differ between institutions, so an admin verifies each one.

## 4. Offer-chance prediction

### Data needed
`ADMISSION_STAT` per programme and year: lowest merit offered, average merit, applicants, places. Sources are official publications or institution announcements, entered or imported by an admin. **This data may not exist for every programme.** When it is missing, the app says so instead of guessing.

### Phase A — margin bands (works with 1–2 years of data)

```
margin = student_merit − average(lowest merit offered, last 3 years)

High    margin ≥ +3
Medium  −2 ≤ margin < +3
Low     margin < −2
No data  fewer than 1 year available
```

The card shows the reason: "Your merit is 2.1 above the average lowest offer (2023–2025)."

### Phase B — logistic regression (when 3+ years exist for most programmes)
- Features: margin, demand ratio (applicants ÷ places), trend of the cut-off.
- Trained offline in the Python worker with scikit-learn; coefficients saved to the database.
- Output: a probability, still shown as High / Medium / Low to avoid false precision.

### How we know it works
Back-test: train on earlier years, predict the latest year, compare with the real cut-off. Report band accuracy in the project write-up.

### Target vs actual
Form 4–5 students see predictions based on **target grades**, always labelled "based on targets".

---

## 5. Accurate content collection

The rule: **AI drafts, admins approve.** Students only ever see approved data.

```
Official source list ──► Fetch (weekly) ──► Extract text ──► Changed?
                                                               │ yes
                                                               ▼
                         Admin review ◄── Validate ◄── LLM draft with quotes
                              │
                              ▼
                     Publish new version ──► Notify students ──► Recompute
```

### 5.1 Sources
- Only whitelisted official domains (university and agency sites, prospectus PDFs).
- Respect `robots.txt`; one request every few seconds per site; identify the crawler.
- Store the URL, last check time and a checksum in `DATA_SOURCE`.

### 5.2 Fetch and extract
- HTML: fetch and strip menus and footers (for example with `trafilatura`).
- PDF with text: `pypdf` or `pdfplumber`.
- Scanned PDF: local OCR.
- Pages that need a browser: Playwright, run in the worker.
- Paid scraping services (such as the Bright Data skills available in this setup) are **not needed** for a curated list of official sites. Keep them as a fallback only if a site blocks normal requests, because they cost money.

### 5.3 Change detection
Compare the new checksum with the last one. **Unchanged pages skip the LLM entirely.** This is the biggest cost saver: after the first run, only a handful of pages change each week.

### 5.4 Extraction with evidence
The LLM receives the page text and a strict JSON schema (programme, route, rules). For every value it must return the **exact quote** it came from. Values without a quote are rejected.

### 5.5 Validation before review
- Subjects must exist in the catalogue (aliases allowed).
- Grades must exist in the grade scale.
- Numbers must be in range (CGPA 0–4, MUET band 1–5+).
- Anything that fails is marked for the admin instead of being dropped.

### 5.6 Admin review
Side-by-side view: the old published version, the new draft, and the source quote for every changed field. The admin publishes, edits or rejects.

### 5.7 Measuring accuracy
Keep a golden set of about 30 programme pages checked by hand. After each change to the extractor, run it on the golden set and record field accuracy. Target: at least 90% of fields right in the draft.

### 5.8 First source: the JPT ePanduan site (planned, Steps 9 and 11)

ePanduan (`online.mohe.gov.my/epanduan`) is the public guide to public-university programmes. It is the first source we automate because it covers many programmes in one consistent layout. **Gate:** the importer runs only after its terms of use are checked (and, ideally, JPT agrees through the supervisor). We never bypass logins, CAPTCHAs, rate limits or terms; if automated reading is not allowed, we fall back to prospectus PDFs and manual entry.

**What the site looks like (checked 27 Oct 2026 on one saved page):**
- Programme lists by candidate category (for example `…/ProgramPengajian/kategoriCalon/S` for STPM), 10 programmes per page, plain server HTML with `?page=N` (the STPM category had 1,002 programmes).
- Each programme card has labelled values: programme name, institution, `KOD PROGRAM` (for example `UP6481003`), `TAHUN`, `PURATA MARKAH MERIT`, study level, duration, NEC field, interview yes/no.
- The field filter lists **157 NEC field codes** (for example `0311 Ekonomi`, `0714 Mechanics and metal trades`); university requirement documents use the same codes for "diploma in a related field".
- Syarat Am and Syarat Khas are loaded by the page's JavaScript when the **Syarat** button is pressed, so they need a headless browser.

**Pipeline (in the content service):**

| Stage | What happens | Kept |
|---|---|---|
| 1. Fetch | Weekly, at night, one request every 3–5 seconds, user agent `EduLaunchBot` with a contact address; list pages with plain HTTP, requirement panels with Playwright pressing **Syarat** like a visitor | Raw page in storage with URL, time and checksum |
| 2. Parse | `cheerio` reads each card **by its label text**, not by position or CSS classes | Staging rows, never the catalogue directly |
| 3. Clean | Strip scripts, styles and tags; decode entities; Unicode NFC; one kind of space and dash; title case for names ("BACELOR … DENGAN KEPUJIAN" → "Bacelor … dengan Kepujian"); `99.43%` → `99.43`, `-`/`Tiada` → null; `07 Semester` → 7; `0311 Ekonomi` → code + name; programme codes must match `^[A-Z]{2}\d{7}$`; de-duplicate by (code, route, year) | Plain text only: scraped HTML is never shown again (no XSS) |
| 4. Match and check | Institutions and subjects through alias lists ("BAHASA MELAYU / BAHASA MELAYU (KERTAS JULAI)" → Bahasa Melayu; "Kepujian" → C, "Lulus" → E for SPM); requirement text parsed by rules first, **Claude** only for lines rules cannot read; every value must carry an exact quote found in the cleaned text; grades must be valid for the subject; numbers in range | Lines that fail are quarantined and marked "needs review", never dropped silently |
| 5. Hand over | Only **changes** become drafts, prepared by a "Pembantu JPT" account in the admin task inbox; an admin approves them on the Step 8 review screen; merit averages go to `ADMISSION_STAT` with year and source link | A report per run: found, matched, changed, needs review |

**Safety rules:**
- The checksum is taken on the **cleaned** text, so cosmetic changes (CSRF tokens, `?v=` on stylesheets) do not count as changes.
- A run that finds no programmes, or misses the expected labels, **stops and alerts** instead of overwriting data.
- Scraped text is data, never instructions, also when it is sent to the model (prompt-injection safe); the model's answer must match the JSON schema or it is rejected.
- Tests use saved pages as fixtures, so development does not load the JPT site.

**Model for requirement text and PDFs:** Claude through the Anthropic API (allowed by the project owner for **public** text, 27 Oct 2026): Claude Sonnet 5.5 (`claude-sonnet-5-5`) for the bulk, Claude Opus 5.5 (`claude-opus-5-5`) for hard tables or a second check, with the Batch API and prompt caching (the catalogue subject list is the cached part). The key lives only in the content service's `.env`. Cost is measured on about 20 programmes and the sample prospectus PDFs before a full run.

### 5.9 Career and pathway data: AI fills gaps, admins approve (planned)

The student roadmap ("work now or continue?", "which branches are open?") is **built by code from verified data**, never generated by an LLM while the student waits. An LLM writing careers on the spot would invent job titles, mix in other countries' routes (for example a US CPA) and guess salaries.

**What the roadmap shows, for example after a Diploma in Accounting (NEC 0411):**

| Branch | Content | Comes from |
|---|---|---|
| A · Work now | Occupations open at diploma level in this field | `CAREER` (MASCO code, minimum qualification level) |
| B · Continue to a degree | Degrees the student is **eligible** for, with a credit-transfer note | Catalogue + eligibility engine + JPT import |
| C · Professional qualification | Routes of the professional body for the field | Professional body sources, verified |
| D · Work first, then study | Part-time, distance learning, APEL | Pathways (`PROGRAM_PATHWAY`) approved by admins |

**When a field has no verified data yet:**
1. The student sees "Career information for this field is being prepared", plus verified information for the broader field group, labelled **general**.
2. The system records a **data gap** (field, level, number of students waiting), shown to admins as a task.
3. A background job asks the LLM to draft careers and pathways for that field **from allowed sources only**. Every item needs a quote and a link.
4. Automatic checks: the MASCO code exists, the qualification level fits (MQF), the link is on an allowed domain, the quote is found in the source. Failures are marked for the admin.
5. An admin approves; from then on every student in that field sees it. Each field is reviewed once, then rechecked yearly or when its source changes.

**Allowed sources (whitelist, kept in `DATA_SOURCE`):**
- MASCO 2020 (Malaysian Standard Classification of Occupations): occupation names and skill levels.
- TalentCorp MyCOL: critical occupations.
- MQA and the Malaysian Qualifications Framework: qualification levels (for example diploma = MQF level 4).
- Professional bodies (for example MIA for accounting) for professional routes.
- JPT / university sites for degree routes and requirements.
- KESUMA starting-salary guidelines by MASCO category, once published; until an official source exists, **no salary is shown**.

Every career and pathway shows its source and year, and the label "guidance, not a job guarantee".

---

## 6. "Ask AI" with sources (RAG)

1. Published pages are split into chunks of 300–500 words and embedded **once**, when published (`CONTENT_CHUNK`).
2. A question is embedded and the 4–6 closest chunks are retrieved with pgvector.
3. The LLM answers only from those chunks and cites them. If nothing relevant is found, it says it does not know and suggests contacting the institution.
4. Common questions are answered from the FAQ first, without an LLM.
5. Answers are cached by question and source version.
6. **No visible quota for students.** Chat is free to use. A silent fair-use guard protects the shared free tier: a short pause only if one account sends many questions within a minute (for example more than 10), and when the provider's limit is reached the app switches to the local model or shows "AI is busy, please try again shortly". Normal students never see a limit.

---

## 7. Model choices and cost tiers

### The order to try

| Tier | What | Use for | Cost |
|---|---|---|---|
| 0 | No AI: rules, templates, SQL, scikit-learn | Eligibility, ranking, reasons, prediction | Free |
| 1 | **Local models via Ollama** on a laptop or lab PC: a 7–8B instruction model (for example Qwen 2.5 7B or Llama 3.1 8B, quantised) and a multilingual embedding model (for example `bge-m3` or `multilingual-e5`) | Embeddings; anything with personal data (unsure slip rows); offline development | Free (needs about 16 GB RAM) |
| 2 | **Free API tiers** (for example Google AI Studio for Gemini, Groq, OpenRouter free models, Cloudflare Workers AI) | Extraction from public pages; "Ask AI" answers during development and the demo | Free within rate limits |
| 3 | **Paid API**, only if quality or limits block the project: Claude Haiku 5.5 (`claude-haiku-5-5`) for bulk extraction; Claude Opus 5.5 (`claude-opus-5-5`) when accuracy matters most | Hard extraction cases; final demo reliability | Low and capped; use the Batch API and prompt caching to cut it further |

Free-tier limits and terms change often. **Check each provider's current limits and data-use terms before you rely on it.**

### Rules that keep the bill near zero
1. **Never send personal data to a free tier.** Some free tiers may use inputs to improve their models. Slips, grades and names stay local (Tier 0 or 1), or go to a paid API with no-training terms.
2. **Skip unchanged content.** Checksums stop repeat extraction.
3. **Do AI work in batches, not per user.** Extraction runs weekly in the worker, not when a student opens a page.
4. **Cache everything.** Extraction results by checksum; answers by question and source version; embeddings once per chunk.
5. **Keep prompts small.** Send only the relevant section of a page and the top retrieved chunks.
6. **Fair-use guard, not quotas.** No daily limit shown to students. A per-minute throttle stops spam and bots from using up the shared free tier for everyone. A monthly budget alarm on any paid key.
7. **Templates before generation.** Reasons and notifications are templates.

### When to run your own model
- **Yes:** local development, embeddings, and anything touching personal data. Ollama on a 16 GB laptop is enough for 7–8B models.
- **Yes, if available:** a university lab server or GPU can host Ollama or vLLM for the demo.
- **No:** renting a cloud GPU to host an LLM 24/7. It costs far more than free or cheap API tiers at this scale.

---

## 8. Hosting at RM0

| Need | Free option | Watch out for |
|---|---|---|
| Web app + API | Vercel Hobby (personal, non-commercial projects) | Function time limits; keep heavy work in the worker |
| Database, auth, storage | Supabase free tier | Projects pause when idle; storage limit |
| Scheduled jobs | GitHub Actions cron | Monthly minute allowance; keep jobs short |
| Local AI | Ollama | Needs RAM; slower on CPU |
| Error tracking | Sentry free tier | Event limits |

Expected cost: **RM0 per month during development.** Optional: a domain name (about RM50 per year) and a small capped paid-API budget for the final demo.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| No historical cut-off data for many programmes | Weak predictions | Show "No data"; start with programmes that publish data; Phase A works with one year |
| Free tier limits or terms change | Features stop working | Provider-agnostic client layer; local fallback; small paid budget as last resort |
| Sites change layout or block the crawler | Stale data | Checksums alert the admin; parser reads labels; a run that finds nothing stops instead of wiping data; manual entry is always possible |
| ePanduan terms do not allow automated reading | No JPT import | Checked before Step 9; ask JPT; prospectus PDFs with AI extraction instead |
| LLM extracts a wrong value | Wrong advice | Quote required for every value, validation, mandatory admin review |
| OCR misreads a grade | Wrong eligibility | Confidence flags, student confirmation, nothing saved unconfirmed |
| AI drafts a career or pathway that is wrong for Malaysia | Misleading advice | Whitelisted Malaysian sources, MASCO/MQF checks, quotes, admin approval; students see verified data only |
