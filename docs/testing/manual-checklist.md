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

---

## Step 4 · Programme directory and programme page (BM and EN)

**Before you start:** `pnpm dev` is running and `pnpm db:seed` has been run once.

### A. Language

- [ ] Open http://localhost:3000. It goes to **/ms/teroka** (or **/en/teroka** if your browser is set to English).
- [ ] Click **EN** at the bottom of the sidebar. The address becomes /en/teroka and every label is in English. Click **BM** to go back.
- [ ] Close the tab, open http://localhost:3000 again. It remembers the language you chose last.

### B. Directory (http://localhost:3000/ms/teroka)

- [ ] The page looks like the Figma screen "Portal / Public directory": sidebar on the left with **Teroka program** highlighted, navy search panel, cards with illustrations.
- [ ] It says **14 program dijumpai**, and that the list includes sample data.
- [ ] Stream cards say **Sekolah menengah**; other cards show the university name.
- [ ] Illustrations: Diploma Sains Komputer shows a laptop on blue; Aliran Sains Tulen shows a microscope on yellow; Diploma Multimedia Kreatif shows the easel on mint; Aliran Sains Sosial / Sastera shows the campus.

### C. Searching

- [ ] Click **Universiti**, type `komuniti`. Only "Kolej Komuniti Contoh C" is left. Press **Enter**, then **Cari program**: 2 programmes.
- [ ] Click **Bidang / jurusan**, use the arrow keys and Enter to choose **Kejuruteraan**, set **Peringkat** to Diploma, search: only **Diploma Kejuruteraan Elektrik**.
- [ ] Type something that matches nothing in a dropdown: it says **Tiada padanan**. Press **Escape**: the previous choice comes back.
- [ ] Choose filters that give no results (for example Kolej Komuniti Contoh C + Ijazah): the "Tiada program sepadan" box appears with **Kosongkan penapis**.
- [ ] Copy the address of a filtered search into a new tab: the same results and the same filters appear.

### D. Programme page

- [ ] Click **Lihat program & syarat** on Diploma Sains Komputer.
  - Header: POLITEKNIK CONTOH B, the programme name, "Diploma • 3 tahun • Komputer & Teknologi Maklumat".
  - Requirements: Laluan kemasukan "Lepasan SPM", then Bahasa Melayu C, Matematik B, **Salah satu daripada** Fizik, Sains atau Matematik Tambahan, Bahasa Inggeris E, and "Pengesahan sumber" saying it is a sample record.
  - Right panel lists the 4 source sentences and shows the documents illustration with no slice of another picture at its edge.
- [ ] Switch to **EN** on this page: it stays on the same programme; subjects become Malay Language, Mathematics, Physics…; the quoted source sentences stay in Malay (they are copied from the source).
- [ ] Open http://localhost:3000/ms/teroka/bukan-id: a "Program ini tidak dijumpai" page, not an error.

### E. Sidebar

- [ ] Click **Banding** (or any item other than Teroka program): a "Sedang dibina" page with a button back to the directory.

**Result:** ☐ All passed ☐ Problems found (describe below)

Tested by: ____________ Date: ____________
