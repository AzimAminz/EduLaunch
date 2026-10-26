# Manual test checklist

Automatic tests check the code. These checks are done by a person, in the browser, after the automatic tests pass. Tick each box; if something does not match, write down what you saw and tell the team.

**Before you start:** Docker Desktop is open, `pnpm dev` is running, and the terminal shows `[gateway] listening on :4000`.

Tip: in Chrome or Edge, tick **Pretty-print** at the top of a JSON page to make it easier to read.

---

## Step 3 · Sample catalogue

### A. Loading the sample data

- [x] In a second terminal, run `pnpm db:seed`. It ends with a table: institutions **3**, fields **9**, subjects **20**, programmes **14**, requirements **14**, rules **37**, pathways **5**, careers **10**, activities **5**, admissionStats **5**.
- [x] Run `pnpm db:seed` again. The numbers are the same, and nothing is duplicated (check B1 still says 14).

### B. Programmes through the website address

| # | Open this address | You should see |
|---|---|---|
| B1 | http://localhost:3000/api/catalogue/programmes | `"total": 14` |
| B2 | http://localhost:3000/api/catalogue/programmes?studyLevel=diploma | `"total": 4` |
| B3 | http://localhost:3000/api/catalogue/programmes?studyLevel=form4_stream | `"total": 4`, and `"institutionId": null` on every one |
| B4 | http://localhost:3000/api/catalogue/programmes?studyLevel=degree | `"total": 3` |
| B5 | http://localhost:3000/api/catalogue/programmes?q=Komputer | `"total": 2`: Diploma Sains Komputer and Ijazah Sarjana Muda Sains Komputer |
| B6 | http://localhost:3000/api/catalogue/programmes?studyLevel=phd | An error saying `studyLevel: Invalid option…` (not a crash) |

- [x] B1 &nbsp; - [x] B2 &nbsp; - [x] B3 &nbsp; - [x] B4 &nbsp; - [x] B5 &nbsp; - [x] B6

### C. Lists used by the forms

| # | Open this address | You should see |
|---|---|---|
| C1 | http://localhost:3000/api/catalogue/subjects | 20 subjects, including "Matematik" and "Sains (sekolah)" |
| C2 | http://localhost:3000/api/catalogue/fields | 9 fields, each with interest weights (`riasecWeights`) |
| C3 | http://localhost:3000/api/catalogue/institutions | 3 institutions, every name contains **Contoh** |

- [x] C1 &nbsp; - [x] C2 &nbsp; - [x] C3

### D. Entry requirements

- [x] Open http://localhost:3000/api/catalogue/requirements/published?programIds=c159b4ac-872f-50af-bffa-adf4af8b5daf (Diploma Sains Komputer; this ID is the same on every computer).
  - 6 rules.
  - Three rules share `"groupNo": 3`. These are the "one of Physics, Science or Additional Mathematics" choice.
  - Every `evidenceQuote` starts with **[Contoh]**, so nobody mistakes it for a real requirement.

### E. Database viewer

- [x] Open Supabase Studio (http://127.0.0.1:54323) → **Table Editor** → schema **catalogue** → table **program**. There are 14 rows and every `publish_status` is `published`.
- [x] Table **requirement**: `prepared_by` and `approved_by` are different on every row (two-admin rule).

### F. Services keep running without RabbitMQ (fix from this step)

- [x] Stop `pnpm dev` (Ctrl + C). Run `docker stop edulaunch-rabbitmq-1`, then `pnpm dev`.
  - Every service still prints `listening on :41xx`, with a yellow warning `RabbitMQ not reachable yet … retrying in the background`.
  - B1 still shows 14 programmes.
- [x] Run `docker start edulaunch-rabbitmq-1`. Within about 10 seconds each service prints `Connected to RabbitMQ`.

**Result:** ☑ All passed ☐ Problems found (describe below)

Tested by: AzimAminz Date: 26 Oct 2026

---

## Step 4 · Programme directory and programme page (BM and EN)

**Before you start:** `pnpm dev` is running and `pnpm db:seed` has been run once.

### A. Language

- [x] Open http://localhost:3000. It goes to **/ms/teroka** (or **/en/teroka** if your browser is set to English).
- [x] Click **EN** at the bottom of the sidebar. The address becomes /en/teroka and every label is in English. Click **BM** to go back.
- [x] Close the tab, open http://localhost:3000 again. It remembers the language you chose last.

### B. Directory (http://localhost:3000/ms/teroka)

- [x] Sidebar on the left with **Teroka program** highlighted, and the navy search panel as in the Figma screen "Portal / Public directory".
- [x] It says **14 program dijumpai**, and that the list includes sample data.
- [x] Each card shows information only (no pictures): programme name as the title, the institution under it (**Sekolah menengah** for streams), level and length, field tags, and the requirement status with a coloured dot.
- [x] The "Lihat program & syarat" buttons line up at the bottom of each row.

### C. Searching

- [x] Click **Universiti**, type `komuniti`. Only "Kolej Komuniti Contoh C" is left. Press **Enter**, then **Cari program**: 2 programmes.
- [x] Click **Bidang / jurusan**, use the arrow keys and Enter to choose **Kejuruteraan**, set **Peringkat** to Diploma, search: only **Diploma Kejuruteraan Elektrik**.
- [x] Type something that matches nothing in a dropdown: it says **Tiada padanan**. Press **Escape**: the previous choice comes back.
- [x] Choose filters that give no results (for example Kolej Komuniti Contoh C + Ijazah): the "Tiada program sepadan" box appears with **Kosongkan penapis**.
- [x] Copy the address of a filtered search into a new tab: the same results and the same filters appear.

### D. Programme page

- [x] Click **Lihat program & syarat** on Diploma Sains Komputer.
  - Header: POLITEKNIK CONTOH B, the programme name, "Diploma • 3 tahun • Komputer & Teknologi Maklumat".
  - Requirements: Laluan kemasukan "Lepasan SPM", then Bahasa Melayu C, Matematik B, **Salah satu daripada** Fizik, Sains atau Matematik Tambahan, Bahasa Inggeris E, and "Pengesahan sumber" saying it is a sample record.
  - Right panel lists the 4 source sentences and shows the documents illustration with no slice of another picture at its edge.
- [x] Switch to **EN** on this page: it stays on the same programme; subjects become Malay Language, Mathematics, Physics…; the quoted source sentences stay in Malay (they are copied from the source).
- [x] Open http://localhost:3000/ms/teroka/bukan-id: a "Program ini tidak dijumpai" page, not an error.

### E. Sidebar

- [x] Click **Banding** (or any item other than Teroka program): a "Sedang dibina" page with a button back to the directory.

**Result:** ☑ All passed ☐ Problems found (describe below)

Tested by: AzimAminz Date: 26 Oct 2026
