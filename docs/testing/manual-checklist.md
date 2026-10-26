# Manual test checklist

Automatic tests check the code. These checks are done by a person, in the browser, after the automatic tests pass. Tick each box; if something does not match, write down what you saw and tell the team.

**Before you start:** Docker Desktop is open, `pnpm dev` is running, and the terminal shows `[gateway] listening on :4000`.

Tip: in Chrome or Edge, tick **Pretty-print** at the top of a JSON page to make it easier to read.

---

## Step 3 · Sample catalogue

### A. Loading the sample data

- [x] In a second terminal, run `pnpm db:seed`. It ends with a table: institutions **3**, fields **9**, subjects **83**, programmes **14**, requirements **14**, rules **37**, pathways **5**, careers **10**, activities **5**, admissionStats **5**.
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
| C1 | http://localhost:3000/api/catalogue/subjects | 83 subjects (SPM, school, STPM, A-Level), including "Matematik" and "Sains (sekolah)" |
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

Since Step 5 every portal page needs an account: log in first.

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

---

## Step 5 · Accounts: sign up, log in, password, onboarding

**Before you start:** `pnpm dev` is running. Once only, restart Supabase so the new login settings apply: stop `pnpm dev`, run `pnpm db:stop` and `pnpm db:start`, then `pnpm dev` again. Sign-up and password emails do not really go out; they arrive in the **test inbox** at http://127.0.0.1:54324.

### A. Private portal

- [x] Open http://localhost:3000. It goes to **/ms/log-masuk**.
- [x] Open http://localhost:3000/ms/teroka while logged out. It goes to the log in page, and the address ends with `?next=%2Fms%2Fteroka`.
- [x] Log in, then open http://localhost:3000/ms/log-masuk: it goes straight to the portal.

### B. Create an account (http://localhost:3000/ms/daftar)

- [x] The page looks like the Figma screen "W / Cipta akaun EduLaunch": form on the left, Rimau on the right.
- [x] Press **Cipta akaun** with everything empty: each field says what is missing, and the consent box asks to be ticked.
- [x] Type a password of 7 characters: "Kata laluan perlu sekurang-kurangnya 8 aksara."
- [x] **Tunjuk** shows the password, **Sembunyi** hides it again.
- [x] Fill in everything correctly. You arrive at **Mulakan dari situasi anda** (/ms/mula).
- [x] Log out and sign up again with the same email: "E-mel ini sudah mempunyai akaun. Cuba log masuk."

### C. Onboarding (/ms/mula)

- [x] The bar at the top shows Cipta akaun ✓ → **Situasi anda** → Dashboard.
- [x] Choose **Tingkatan 1–3**: the buttons 1, 2, 3 appear. Choose 3: the button says "Teruskan ke dashboard Tingkatan 3".
- [x] Press the button without choosing a form (choose Tingkatan 4–5 and press at once): "Pilih tingkatan anda."
- [x] Choose a level and continue: you arrive at the portal (/ms/utama, "Sedang dibina" for now).
- [x] Log out and log in again: you go straight to the portal, not to onboarding.

### D. Log in and log out (http://localhost:3000/ms/log-masuk)

- [x] The page looks like the Figma screen "P / Log masuk".
- [x] A wrong password says "E-mel atau kata laluan tidak betul." and keeps the email you typed.
- [x] The sidebar shows **Log masuk sebagai** with your name, and **Log keluar** takes you back to the log in page.
- [x] Switch to **EN**: every label on the log in, sign up and onboarding pages is in English.

### E. Forgot password

- [x] On the log in page click **Lupa kata laluan?**, enter your email, press **Hantar pautan pemulihan**: the "Semak peti masuk anda" page appears.
- [x] Open the test inbox (http://127.0.0.1:54324) and the newest email. It has the EduLaunch design (navy bar, yellow line, Rimau with a shield), greets you by name, and is in the language you last logged in with.
- [x] Click the button in the email: you land on **Tetapkan kata laluan baharu**.
- [x] Save a new password: you arrive in the portal. Log out and log in with the new password.
- [x] A second email arrives: **Kata laluan anda telah ditukar** (security notice).
- [x] Click the same email link again: you land on **Pulihkan akses akaun** with the message that the link has expired.

### F. Admin

- [x] In a terminal run `pnpm admin:grant <your email>`, then log out and log in: you land on **Konsol admin**.
- [x] As an admin, open http://localhost:3000/ms/teroka, /ms/utama and /ms/mula: each one goes back to the admin console (admins never see student pages).
- [x] Run `pnpm admin:grant <your email> --revoke`, log out and in: you are a student again. http://localhost:3000/ms/admin now goes to the portal.

### G. Sidebar on different screen sizes

- [x] Desktop: the panel button next to the logo shrinks the sidebar to icons only (hovering an icon shows its name). Reload the page: it stays small. Press again to widen it.
- [x] Make the window narrow (or open the page on your phone): the sidebar is hidden and a top bar with a menu button appears. The menu slides the sidebar in; tapping outside it, pressing Escape or choosing a page closes it.
- [x] On a phone, the directory, programme page and log in pages need no sideways scrolling.

**Result:** ☑ All passed ☐ Problems found (describe below)

Tested by: AzimAminz Date: 26 Oct 2026

---

## Step 6 · Academic results and profile

**Before you start:** `pnpm dev` is running, and `pnpm db:migrate` and `pnpm db:seed` have been run after pulling. Use a student account (not an admin).

### A. Results form follows the education level

- [ ] Open **Dokumen akademik** in the sidebar. The form matches your level:
  - Tingkatan 1–3: **Prestasi sekolah anda**, grades A–F, with a tab for each year (Form 1, 2, 3).
  - Tingkatan 4–5: **Subjek SPM & sasaran**, yellow grade boxes and the note that targets are not official results.
  - Lepasan SPM: **Keputusan SPM sebenar**.
  - Lepasan pra-universiti or Diploma: two tabs, **Kelayakan** and **SPM asas** (see D).
- [ ] A new form starts with the compulsory subjects and no grades. The label at the top says **Belum diisi**.

### B. Subjects and grades (all dropdowns use the EduLaunch design)

- [ ] Grade boxes and the year open the EduLaunch dropdown (not the browser's own list) and work with the keyboard (arrows, Enter, Escape).
- [ ] In **Cari subjek…** type `arab`: Bahasa Arab appears. Type `add maths`: only Matematik Tambahan appears.
- [ ] Type `Tasawwuf`: the list offers **+ Tambah “Tasawwuf” sebagai subjek lain**. Choose it: a row with the yellow label **Subjek lain** appears, and a short note explains it is not used in eligibility checks yet.
- [ ] × removes a row. Under the table it only says how many subjects still need a grade (nothing when all are graded).
- [ ] Press **Simpan & sahkan** with a missing grade: "Pilih gred untuk setiap subjek." and the empty boxes turn red.
- [ ] Give every subject a grade and save: "✓ Disimpan dan disahkan." appears next to the button and the label at the top says **Disahkan**, without reloading. Change a grade: the label says **Ada perubahan belum disimpan**.
- [ ] The "✓ Disimpan dan disahkan." message fades in, then fades out by itself after a few seconds. Press save again: it shows again.
- [ ] Reload: the same subjects (including Tasawwuf), grades and year are there.

### C. Saved records (history)

- [ ] **Rekod tersimpan** on the right lists every saved record, e.g. "Prestasi sekolah 2025", "Sasaran SPM 2026", "Diploma 2025 · PNGK 3.42 · MUET 3.5". The one in the form says **Sedang dibuka**.
- [ ] **Lihat** opens an older record read only (subjects and grades, or CGPA and MUET).
- [ ] Tingkatan 1–3: save results for two different year tabs; both appear in the list and each tab shows its own grades.

### D. After pre-university or Diploma

- [ ] **Lepasan Diploma**, tab **Kelayakan**: Bidang diploma (searchable), Nama program, PNGK, MUET and Tahun tamat. There is no subject table.
- [ ] Save without a year: "Pilih tahun keputusan." With PNGK `4.5`: "PNGK ialah nombor antara 0.00 dan 4.00…". With `3,42` (comma): it saves.
- [ ] **Lepasan pra-universiti**: choose STPM, Matrikulasi, Asasi or A-Level. Matrikulasi and Asasi ask for PNGK and MUET only; STPM also has a subject table starting with Pengajian Am; A-Level has subjects (A*–E) but no PNGK.
- [ ] The blue box "Apa yang universiti semak" summarises the usual requirements.
- [ ] Tab **SPM asas**: the SPM form, with a note on why SPM still matters.

### E. Profile (click your name at the bottom of the sidebar)

- [ ] **Profil saya** shows your name, email, level and a summary: "Disahkan · N subjek", or for diploma and pre-university "Diploma · PNGK 3.42 · MUET 3.5".
- [ ] Open **Tukar tahap pendidikan**, choose another level, press **Simpan tahap**: "Tahap pendidikan dikemas kini." fades in and out, you stay on the page, the chosen level stays selected and the summary above changes at once (no reload).
- [ ] Dokumen akademik now shows the form for the new level, and your earlier records are still in Rekod tersimpan.

### F. Phone

- [ ] On a narrow window the forms fit without sideways scrolling (the Kategori column is hidden, fields stack).

**Result:** ☐ All passed ☐ Problems found (describe below)

Tested by: ____________ Date: ____________
