# Manual test checklist

Automatic tests check the code. These checks are done by a person, in the browser, after the automatic tests pass. Tick each box; if something does not match, write down what you saw and tell the team.

**Before you start:** Docker Desktop is open, `pnpm dev` is running, and the terminal shows `[gateway] listening on :4000`.

Tip: in Chrome or Edge, tick **Pretty-print** at the top of a JSON page to make it easier to read.

---

## Step 3 · Sample catalogue

### A. Loading the sample data

- [ ] In a second terminal, run `pnpm db:seed`. It ends with a table: institutions **3**, fields **9**, subjects **20**, programmes **14**, requirements **14**, rules **37**, pathways **5**, careers **10**, activities **5**, admissionStats **5**.
- [ ] Run `pnpm db:seed` again. The numbers are the same, and nothing is duplicated (check B1 still says 14).

### B. Programmes through the website address

| # | Open this address | You should see |
|---|---|---|
| B1 | http://localhost:3000/api/catalogue/programmes | `"total": 14` |
| B2 | http://localhost:3000/api/catalogue/programmes?studyLevel=diploma | `"total": 4` |
| B3 | http://localhost:3000/api/catalogue/programmes?studyLevel=form4_stream | `"total": 4`, and `"institutionId": null` on every one |
| B4 | http://localhost:3000/api/catalogue/programmes?studyLevel=degree | `"total": 3` |
| B5 | http://localhost:3000/api/catalogue/programmes?q=Komputer | `"total": 2`: Diploma Sains Komputer and Ijazah Sarjana Muda Sains Komputer |
| B6 | http://localhost:3000/api/catalogue/programmes?studyLevel=phd | An error saying `studyLevel: Invalid option…` (not a crash) |

- [ ] B1 &nbsp; - [ ] B2 &nbsp; - [ ] B3 &nbsp; - [ ] B4 &nbsp; - [ ] B5 &nbsp; - [ ] B6

### C. Lists used by the forms

| # | Open this address | You should see |
|---|---|---|
| C1 | http://localhost:3000/api/catalogue/subjects | 20 subjects, including "Matematik" and "Sains (sekolah)" |
| C2 | http://localhost:3000/api/catalogue/fields | 9 fields, each with interest weights (`riasecWeights`) |
| C3 | http://localhost:3000/api/catalogue/institutions | 3 institutions, every name contains **Contoh** |

- [ ] C1 &nbsp; - [ ] C2 &nbsp; - [ ] C3

### D. Entry requirements

- [ ] Open http://localhost:3000/api/catalogue/requirements/published?programIds=c159b4ac-872f-50af-bffa-adf4af8b5daf (Diploma Sains Komputer; this ID is the same on every computer).
  - 6 rules.
  - Three rules share `"groupNo": 3`. These are the "one of Physics, Science or Additional Mathematics" choice.
  - Every `evidenceQuote` starts with **[Contoh]**, so nobody mistakes it for a real requirement.

### E. Database viewer

- [ ] Open Supabase Studio (http://127.0.0.1:54323) → **Table Editor** → schema **catalogue** → table **program**. There are 14 rows and every `publish_status` is `published`.
- [ ] Table **requirement**: `prepared_by` and `approved_by` are different on every row (two-admin rule).

### F. Services keep running without RabbitMQ (fix from this step)

- [ ] Stop `pnpm dev` (Ctrl + C). Run `docker stop edulaunch-rabbitmq-1`, then `pnpm dev`.
  - Every service still prints `listening on :41xx`, with a yellow warning `RabbitMQ not reachable yet … retrying in the background`.
  - B1 still shows 14 programmes.
- [ ] Run `docker start edulaunch-rabbitmq-1`. Within about 10 seconds each service prints `Connected to RabbitMQ`.

**Result:** ☐ All passed ☐ Problems found (describe below)

Tested by: ____________ Date: ____________
