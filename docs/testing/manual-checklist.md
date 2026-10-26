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

- [x] Open **Dokumen akademik** in the sidebar. The form matches your level:
  - Tingkatan 1–3: **Prestasi sekolah anda**, grades A–F, with a tab for each year (Form 1, 2, 3).
  - Tingkatan 4–5: **Subjek SPM & sasaran**, white grade boxes like the other forms, and the note that targets are not official results. Form 4 shows one tab (**Tingkatan 4 · this year**); Form 5 shows **Tingkatan 5 · this year** and **Tingkatan 4 · last year**, with a note that the Form 4 tab is optional. Grades saved in Form 4 are still there after moving to Form 5.
  - Lepasan SPM: **Keputusan SPM sebenar**.
  - Lepasan Sijil / SVM / SKM, or Lepasan pra-U / Diploma: two tabs, **Kelayakan** and **SPM asas** (see D).
- [x] A new form starts with the compulsory subjects and no grades. The label at the top says **Belum diisi**.

### B. Subjects and grades (all dropdowns use the EduLaunch design)

- [x] Grade boxes and the year open the EduLaunch dropdown (not the browser's own list) and work with the keyboard (arrows, Enter, Escape).
- [x] In **Cari subjek…** type `arab`: Bahasa Arab appears. Type `add maths`: only Matematik Tambahan appears.
- [x] Type `Tasawwuf`: the list offers **+ Tambah “Tasawwuf” sebagai subjek lain**. Choose it: a row with the yellow label **Subjek lain** appears, and a short note explains it is not used in eligibility checks yet.
- [x] × removes a row. Under the table it only says how many subjects still need a grade (nothing when all are graded).
- [x] Press **Simpan & sahkan** with a missing grade: "Pilih gred untuk setiap subjek." and the empty boxes turn red.
- [x] Give every subject a grade and save: "✓ Disimpan dan disahkan." appears next to the button and the label at the top says **Disahkan**, without reloading. Change a grade: the label says **Ada perubahan belum disimpan**.
- [x] The "✓ Disimpan dan disahkan." message fades in, then fades out by itself after a few seconds. Press save again: it shows again.
- [x] Reload: the same subjects (including Tasawwuf), grades and year are there.

### C. Saved records (history)

- [x] **Rekod tersimpan** on the right lists every saved record, e.g. "Prestasi sekolah 2025", "Sasaran SPM 2026", "Diploma 2025 · PNGK 3.42 · MUET 3.5". The one in the form says **Sedang dibuka**.
- [x] **Lihat** opens an older record read only (subjects and grades, or CGPA and MUET).
- [x] Tingkatan 1–3: save results for two different year tabs; both appear in the list and each tab shows its own grades.

### D. After a certificate, pre-university or diploma

- [x] Onboarding lists five levels: Tingkatan 1–3, Tingkatan 4–5, Lepasan SPM, **Lepasan Sijil / SVM / SKM**, **Lepasan STPM / Matrikulasi / Asasi / A-Level / Diploma**.
- [x] Choosing one of the last two opens a dialog asking which qualification: Sijil Politeknik / Kolej Komuniti, SVM or SKM; or STPM, Matrikulasi, Asasi, A-Level, Diploma, DVM or DKM/DLKM.
- [x] Dokumen akademik shows only the chosen qualification ("Jenis kelayakan: …") with a link to change it in Profil.
- [x] **SKM**: Bidang, Nama program, Tahap (SKM Tahap 1–3), MUET, Tahun tamat; no PNGK. **Sijil** and **SVM**: Bidang, Nama program, PNGK, MUET, Tahun tamat.
- [x] **Diploma / DVM / DKM**: Bidang, Nama program, PNGK, MUET, Tahun tamat (DKM also asks DKM Tahap 4 or DLKM Tahap 5). No subject table.
- [x] Save without a year: "Pilih tahun keputusan." With PNGK `4.5`: "PNGK ialah nombor antara 0.00 dan 4.00…". With `3,42` (comma): it saves.
- [x] **Matrikulasi**: choose **Jurusan** (Sains Modul I/II/III, Kejuruteraan, Perakaunan, Perakaunan Profesional); its four subjects appear by themselves, you only add grades (A to E). Saving without a jurusan: "Pilih jurusan Matrikulasi anda." Subjects left without a grade are not saved, but they are listed again when you come back.
- [x] **Asasi**: Bidang, Nama program (e.g. Asasi Sains Hayat), PNGK, MUET, and an optional subject table. **+ Tambah subjek** lists Asasi subjects only (Biologi (Asasi), Kimia (Asasi)…), not matriculation ones.
- [x] The page title names your qualification: **Kelayakan Matrikulasi**, **Kelayakan Asasi**, **Kelayakan Diploma**, **Kelayakan SKM**…
- [x] **Keputusan semester** (Matrikulasi and Asasi): two semesters to start; **+ Tambah semester** adds one (up to 8), × removes the last. Enter PNGS for the semesters you finished (e.g. 3.50 and 3,80); after saving and reloading they are still there. Diploma has no semester section.
- [x] **Bidang**: type a field that is not in the list (e.g. Sains Sukan) and choose **+ Tambah “Sains Sukan” sebagai bidang lain**; it is kept after reloading.
- [x] **STPM** has a subject table starting with Pengajian Am; **A-Level** has subjects (A*–E) but no PNGK.
- [x] The blue box "Apa yang universiti semak" summarises the usual requirements for the level.
- [x] Tab **SPM asas**: the SPM form, with a note on why SPM still matters.

### E. Profile (click your name at the bottom of the sidebar)

- [x] **Profil saya** shows your name, email, level and a summary: "Disahkan · N subjek", or for diploma and pre-university "Diploma · PNGK 3.42 · MUET 3.5".
- [x] Open **Tukar tahap pendidikan**, choose a higher level, press **Simpan tahap**: "Tahap pendidikan dikemas kini." fades in and out, you stay on the page, the chosen level stays selected and the summary above changes at once (no reload).
- [x] Dokumen akademik now shows the form for the new level, and your earlier records are still in Rekod tersimpan (after moving up).

### F. Changing level: what is kept and what is deleted

- [x] Tingkatan 1 shows one tab (**Tingkatan 1 · this year**); Tingkatan 2 shows two (this year and last year); Tingkatan 3 shows three.
- [x] Moving up (Tingkatan 1 → 2, Tingkatan 3 → 4–5, Tingkatan 5 → Lepasan SPM): no dialog, and all saved records stay in Rekod tersimpan.
- [x] Moving down (for example Tingkatan 2 → 1 with results saved for last year): a dialog lists **Prestasi sekolah (last year)** under "Rekod ini akan dipadam". **Batal** changes nothing; **Sahkan & simpan** deletes it.
- [x] Choosing **Lepasan STPM / Matrikulasi / Asasi / A-Level**: a dialog asks which qualification. After choosing Asasi, Dokumen akademik shows the Asasi form only (no buttons for the others), with a link to change it in Profil.
- [x] Asasi (with results saved) → Diploma (same level, other qualification): the dialog lists **Asasi** to be deleted; after confirming, the diploma form shows and Asasi is gone from Rekod tersimpan. The SPM results stay.
- [x] SKM (saved) → Diploma: no records are deleted; Rekod tersimpan shows both. Then Diploma → SVM: the dialog lists Diploma and SKM to be deleted.
- [x] A student can save up to 30 subjects (for example 20 SPM subjects).

### G. Phone

- [x] On a narrow window the forms fit without sideways scrolling (the Kategori column is hidden, fields stack).

**Result:** ☑ All passed ☐ Problems found (describe below)

Tested by: AzimAminz Date: 26 Oct 2026

---

## Step 7 · "Can I get in?" on the programme page

**Before you start:** `pnpm dev` is running, and you have a student account. Open a programme from **Teroka program** (for example Diploma Sains Komputer).

### A. Without results

- [x] A new student (no confirmed results) sees **Boleh ke saya masuk?** with "Isi dan sahkan keputusan anda dahulu…" and a button **Isi keputusan saya** that opens Dokumen akademik.

### B. After SPM

- [x] Level Lepasan SPM, with actual SPM results saved (Bahasa Melayu B, Matematik C+, Fizik B, …). The card says **Hampir layak** or **Belum memenuhi syarat** for laluan Lepasan SPM, and lists every requirement:
  - ✓ "Bahasa Melayu: perlu C, anda B"
  - ✗ "Matematik: perlu B, anda C+"
  - an either/or requirement as **Salah satu daripada:** with each subject.
- [x] Change Matematik to B in Dokumen akademik, come back: the card says **Anda memenuhi syarat** and the "Kemas kini keputusan" button is gone.

### C. Targets and other routes

- [x] Level Tingkatan 4–5 with SPM targets saved: the card adds "Berdasarkan gred sasaran anda, bukan keputusan sebenar."
- [x] Level Lepasan pra-U / Diploma with STPM: on a programme that only lists the SPM route, the card says the programme has no requirements for your route yet and names the routes it lists.
- [x] On a programme without verified requirements: "Syarat program ini belum disahkan…" (no guess).
- [x] Switch to **EN**: the card is in English ("Can I get in?", "Mathematics: B needed, you have C+").

**Result:** ☑ All passed ☐ Problems found (describe below)

Tested by: AzimAminz Date: 26 Oct 2026

---

## Step 8 · Admin console

**Before you start:** `pnpm dev` is running, and `pnpm db:migrate` has been run after pulling. You need **two admin accounts** (the person who prepares a draft cannot approve it): sign up twice in the web app, then run `pnpm admin:grant <email>` for each. Use two browsers (or one normal and one private window), one per admin. Below they are called **Admin A** and **Admin B**.

### A. Admin pages are for admins only

- [ ] Admin A logs in and lands on **Laman utama** ("Selamat datang, …") with three tasks: **Semak draf yang menunggu**, **Kemas kini syarat program**, **Tambah program baharu**.
- [ ] The sidebar shows **Kerja hari ini** (Laman utama, Peti tugasan) and **Katalog** (Institusi, then Program). It collapses like the student sidebar, and works as a menu on a phone.
- [ ] A student who types `/ms/admin` in the address bar is sent back to the student portal.

### B. Institutions (start here)

- [ ] **Institusi** → **Tambah institusi** (top right): name, short name, type, **Negeri** and website (`https://…`), then **Simpan**. The new institution's **profile** opens.
- [ ] A website without `https://` shows "Laman web mesti bermula dengan https://".
- [ ] The profile has four tabs. **Ringkasan**: counts (Diterbitkan, Belum diterbitkan, Tanpa syarat diterbitkan, Diarkib; each opens the matching list) and one **Langkah seterusnya** (for a new institution: add its first programme).
- [ ] **Sumber & import**: the website is listed; add a source (type **Prospektus / PDF syarat**, a link, a note), then **Buang** removes it.
- [ ] **Tetapan**: change the details and **Simpan**. In the institution list each row shows its programmes ("4 program · 4 diterbitkan") and **Buka**.
- [ ] **Padam institusi…** (Tetapan, Zon bahaya) opens a window listing what goes with it (programmes, requirement versions, merit records, pathways, sources). **Padam semua** stays grey until you type the short name (for example `UTeM`; letter case does not matter).
- [ ] An institution with no published programmes is deleted at once, with everything under it, and you return to the list.
- [ ] Universiti Contoh A (students see its programmes): typing `UCA` gives **Hantar untuk kelulusan**. Nothing is deleted; Admin B sees "Permintaan padam institusi" in **Peti tugasan** and, on the institution's Tetapan tab, can **Luluskan & padam semua** or **Batalkan permintaan**. (Use **Batalkan** unless you want to lose the sample data.)

### C. A new programme needs another admin

- [ ] Admin A: open the institution from B → **Tambah program di sini**: the institution is already chosen. Fill in Peringkat, name, **Kod program** (for example `uc6522001`, saved as `UC6522001`), Kod universiti, Fakulti, **Bidang NEC** (type `0712`; the recommendation field **Kejuruteraan** is added by itself), 8 semesters, Mod pengajian, Kampus, the four ticks under Kemasukan and the source link, then **Simpan draf**. The programme page opens with the status **Draf** and every value kept; its back link leads to the institution.
- [ ] A second programme with the same Kod program is refused: "Kod program ini sudah digunakan oleh program lain." A code like `BELG` in that field shows "Kod program mesti seperti UC6522001."
- [ ] Admin A: **Hantar untuk semakan**. The status becomes **Menunggu semakan**, the details are locked, and there is no approve button for Admin A.
- [ ] Admin B: **Peti tugasan** shows the programme under **Untuk saya** (with a number on the sidebar). Open it, press **Pulangkan dengan sebab**, write a reason and send. Admin A sees **Dipulangkan** with that reason, corrects the details, and sends it again.
- [ ] Admin B: **Luluskan & terbitkan**. The status becomes **Diterbitkan**; students now find the programme in **Teroka program** (allow up to a minute).
- [ ] **Program** in the sidebar: filter by institution (KCC, PCB, UCA…), by status, and by **Belum ada syarat diterbitkan**. The home card **Kemas kini syarat program** opens that last filter when such programmes exist.

### D. Requirement wizard

- [ ] On the programme page, **Syarat kemasukan ikut laluan** lists the usual routes for the level (a diploma: Lepasan SPM, Sijil, SVM, SKM, STPM). Admin A presses **Tambah syarat** on Lepasan SPM: the wizard opens.
- [ ] Press **Hantar untuk semakan** with nothing filled in: the missing parts turn red and a message says how many to fix.
- [ ] Fill in the source link, then write:
  - "Pelajar perlu **Gred subjek** minimum **C** dalam **Bahasa Melayu**", with its source sentence;
  - **+ Tambah syarat**, type **Bilangan kepujian**, gred C, 3 subjects;
  - **+ Tambah syarat** with Matematik, then **+ atau pilihan lain** with Fizik ("SALAH SATU daripada").
- [ ] **Apa pelajar nampak** on the right updates while typing. **Simpan draf** shows "Draf disimpan." and "Ada perubahan belum disimpan" disappears.
- [ ] Changing a subject to an STPM subject clears an SPM-only grade such as A+.
- [ ] **Hantar untuk semakan**: the page shows **Menunggu semakan** and Admin A can no longer edit it.

### E. Reviewing requirements

- [ ] Admin B opens it from **Peti tugasan**: **1. Apa yang berubah?** shows the current version (or "Ini syarat pertama") next to the new draft; **2. Semak sumber** has the source link and the quoted sentences.
- [ ] **Pulangkan dengan soalan** with a reason: Admin A sees the reason at the top of the wizard, changes a grade and sends again.
- [ ] Admin B: **Luluskan & terbitkan**. A student opening the programme sees the new requirements and the "Boleh ke saya masuk?" check uses them.
- [ ] Admin A: **Kemas kini syarat** on the same route starts **versi 2** with the published rules already filled in. Admin B's review shows the changed line marked **Baharu** and the old one **Dibuang**. **Buang draf** (by Admin A) removes the draft and version 1 stays published.

### F. Language and phone

- [ ] Switch to **EN**: every admin page is in English.
- [ ] On a narrow window the pages need no sideways scrolling (the programme table scrolls inside its box).

**Result:** ☐ All passed ☐ Problems found (describe below)

Tested by: ____________ Date: ____________
