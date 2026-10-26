# EduLaunch — Pelan Pembangunan Sistem

> **Status:** Cadangan perancangan teknikal berdasarkan *Workshop 2 Proposal Form* (Group 20, BITU 3923). Keperluan sebenar, skop institusi dan rubrik penilaian perlu dimuktamadkan bersama penyelia.

## 1. Ringkasan produk

EduLaunch ialah platform penerokaan pendidikan untuk pelajar, ibu bapa, kaunselor dan orang awam. Halaman awam berfungsi sebagai pengenalan produk, cara berfungsi dan pratonton statik. Pengguna perlu log masuk untuk mengakses katalog, perbandingan, semakan kelayakan, psikometrik dan alat perancangan peribadi. Nilai tambah EduLaunch ialah cadangan peribadi, psikometrik dan roadmap pendidikan hingga kerjaya. Ia bukan portal permohonan rasmi atau wakil UPU. Sistem menggabungkan data yang bersumber dan boleh dijejak dengan pemadanan berasaskan peraturan serta bantuan AI untuk penerangan dan penerokaan.

**Prinsip utama:** AI tidak menentukan syarat kemasukan atau kelayakan. Syarat rasmi disimpan secara berstruktur dengan sumber dan tarikh semakan; enjin peraturan yang deterministik mengira padanan. Jika data tiada, samar atau bercanggah, sistem nyatakan “belum dapat disahkan” dan minta semakan manusia.

## 2. Objektif dan skop MVP

1. Penilaian minat/psikometrik berstruktur dan paparan profil minat.
2. Profil akademik, input manual dan aliran muat naik slip dengan persetujuan, semakan bacaan dan pengurusan dokumen.
3. Katalog institusi/program dengan syarat kemasukan, sumber rasmi, tarikh kuat kuasa dan status kesahihan.
4. Semakan kelayakan yang boleh diterangkan, termasuk syarat dipenuhi/tidak dipenuhi/tidak diketahui.
5. Cadangan program berdasarkan kelayakan, minat dan pilihan pelajar; alternatif laluan jika belum layak.
6. Perbandingan program, simpanan senarai pendek dan roadmap pendidikan/kerjaya.
7. Panel pentadbiran dengan analitik, pengurusan katalog, sumber, formula merit, pengesahan, pengguna, kandungan, laporan isu dan audit.

**Bukan matlamat MVP:** menjamin kemasukan, membuat keputusan rasmi bagi pihak universiti, scraping laman yang melarangnya, atau membina microservices penuh sebelum beban dan keperluan sebenar diketahui.

## 3. Modul sistem

| Modul | Fungsi utama | Kebergantungan |
|---|---|---|
| Akaun & profil pelajar | Daftar/log masuk, persetujuan, profil, subjek dan keputusan | Auth, pangkalan data |
| Penilaian minat | Admin import/urus instrumen dibenarkan; sistem mentadbir soalan, mengira dan menyimpan skor secara automatik; AI membantu penerangan | Bank soalan versi terkawal, enjin skor deterministik, profil pengguna |
| Direktori institusi/program | Cari, tapis dan lihat program serta sumber data | Katalog program |
| Pengambilan data | Import API/CSV/PDF/halaman yang dibenarkan, simpan bukti dan status | Crawler/ingestion, storan dokumen |
| Pengesahan & kurasi | Semak medan, perbezaan versi, kelulusan manusia, jejak audit | Panel pentadbir, workflow |
| Enjin syarat kemasukan | Bandingkan keputusan dengan syarat berstruktur | Rules engine, rekod rasmi yang diluluskan |
| Cadangan program | Ranking telus berdasarkan kriteria dan penapis kelayakan | Profil, skor minat, enjin syarat |
| Roadmap | Sistem menjana roadmap peribadi secara automatik dengan AI dan graf laluan disahkan; simpan versi, cabang pilihan dan kemajuan mengikut pengguna | Profil, hasil penilaian, rules engine, graf laluan Malaysia, database pengguna |
| Pembantu AI | Tanya-jawab bersumber (RAG) untuk menerangkan program dan pilihan | LLM, carian dokumen |
| Admin & pemantauan | Urus sumber, semakan gagal, rekod lapuk, log dan metrik | RBAC, audit log |

## 4. Aliran data institusi dan program

### Keutamaan sumber

1. API/feeds rasmi atau dataset rasmi yang dibenarkan.
2. Fail rasmi yang diterbitkan institusi (CSV, XLSX, PDF, prospektus).
3. Halaman web rasmi yang boleh diakses dan syarat penggunaan membenarkan pengambilan automatik.
4. Input manual oleh penyelidik/admin apabila automasi tiada, disekat CAPTCHA/login/anti-bot, atau kandungan tidak boleh diekstrak dengan yakin.

Jangan memintas CAPTCHA, login, sekatan teknikal atau polisi laman. Jika dilarang atau tidak jelas, hentikan pengambilan automatik dan gunakan proses manual dengan rekod asal.

### Proses ingestion

1. Daftar sumber (domain, URL, pemilik, jenis sumber, kebenaran/polisi, kekerapan, tarikh semakan).
2. Ambil kandungan dengan had kadar, cache dan pengenal pasti versi; simpan salinan bukti, URL, masa tangkapan dan hash fail.
3. Ekstrak medan calon: nama institusi/program, tahap, tempoh, kampus, intake, syarat am/khusus, subjek, gred minimum, tarikh kuat kuasa dan pautan.
4. Validasi skema dan jenis data; tandakan medan yang hilang, konflik atau tidak jelas. Jangan auto-publish rekod yang gagal validasi.
5. Padankan rekod lama/baru, tunjuk perubahan medan dan bukti kepada penyemak.
6. Penyemak meluluskan, membetulkan atau menolak. Simpan siapa, bila, sebab dan versi terdahulu.
7. Terbitkan hanya rekod diluluskan; jadualkan semakan semula mengikut kitaran kemas kini sumber dan paparkan tarikh semakan.

### Ketepatan dan pengesahan

Ketepatan “100%” tidak boleh dijanjikan untuk scraping atau ekstraksi umum: laman berubah, PDF boleh kabur/imbas, OCR boleh tersalah baca dan syarat boleh mempunyai pengecualian. Sistem patut menjamin **tiada tuntutan kelayakan tanpa bukti yang boleh dijejak**, bukannya mendakwa tiada ralat.

- Syarat yang mempengaruhi keputusan kelayakan mesti disahkan manusia terhadap sumber rasmi sebelum diterbitkan.
- Ekstraksi automatik menghasilkan draf sahaja; setiap nilai mesti menyimpan petikan/lokasi halaman atau pautan sumber.
- Gunakan dua orang penyemak untuk syarat kritikal jika kapasiti membenarkan; jika tidak, seorang penyemak dan audit berkala.
- Tandakan rekod `verified`, `pending_review`, `conflict`, `stale` atau `unavailable`; hanya `verified` digunakan untuk keputusan kelayakan.
- Paparkan alasan setiap keputusan: syarat, nilai pelajar, sumber dan tarikh sumber. Data profil yang tidak lengkap menghasilkan “tidak dapat dipastikan”, bukan lulus.
- Tetapkan SLA kesegaran data; selepas tarikh luput, sembunyikan kepastian atau minta semakan baharu.

## 5. Cadangan seni bina dan teknologi

### Pilihan disyorkan untuk projek pelajar

Mulakan dengan **modular monolith**, bukan microservices. Ia mengurangkan kerumitan deployment, debugging dan integrasi untuk pasukan kecil; modul boleh dipisahkan kemudian jika ada bukti keperluan penskalaan atau pasukan operasi khusus.

- **Frontend + API:** Next.js, TypeScript, UI responsif dan aksesibiliti asas.
- **Backend domain/ingestion:** Python FastAPI untuk API, pemprosesan dokumen dan tugasan ingestion. Alternatifnya, satu stack Next.js sahaja jika pasukan mahir TypeScript dan fungsi ingestion ringan.
- **Database:** PostgreSQL; pgvector hanya jika carian semantik benar-benar diperlukan. Data kelayakan disimpan dalam medan berstruktur/relasi, bukan hanya embeddings.
- **Background jobs:** mula dengan job queue ringkas (contohnya Redis + worker) atau scheduler; jangan tambah komponen jika bilangan sumber masih kecil.
- **Fail dan bukti:** object storage S3-compatible untuk PDF/dokumen dan snapshot sumber; simpan metadata/hash dalam PostgreSQL.
- **Deploy:** Docker Compose untuk pembangunan; deploy satu servis web/API dan worker pada hosting yang menyokongnya. Simpan secrets dalam secret manager/environment konfigurasi, bukan Git.
- **Auth:** penyedia auth terurus atau NextAuth/Auth.js; role pelajar, penyemak dan admin.
- **Pemantauan:** log berstruktur, error reporting dan audit trail untuk perubahan data.

### Bila microservices sesuai

Pertimbang pemisahan hanya apabila ingestion, carian atau AI mempunyai skala/keperluan operasi berlainan, deployment bebas benar-benar diperlukan, atau ada pemilik pasukan bagi setiap servis. Calon sempadan kemudian: `catalog/eligibility`, `ingestion`, `recommendation/AI`, `identity`. Untuk MVP, sempadan ini boleh kekal sebagai modul dan worker berasingan dalam satu repo.

## 6. AI dan penggunaan API

### Cadangan pendekatan

Gunakan API LLM sahaja pada peringkat awal; jangan latih model sendiri. Pilih satu pembekal utama dan satu pilihan sandaran selepas menilai kos, latency, bahasa Melayu/Inggeris, privasi, ketersediaan rantau dan syarat penggunaan. Model tepat boleh dipilih semasa prototaip berdasarkan penilaian berstruktur, kerana harga dan keupayaan berubah.

### Tugasan AI yang sesuai

- Merumus dan menerangkan program dengan petikan sumber.
- Soal-jawab berasaskan dokumen institusi melalui RAG, dengan jawapan hanya daripada sumber yang diluluskan.
- Membantu ekstrak draf medan daripada PDF/HTML untuk semakan manusia.
- Menjana roadmap peribadi berstruktur serta penerangan dan alternatif daripada graf laluan Malaysia yang telah disahkan; sistem mengesahkan semua rujukan dan prasyarat sebelum menyimpan hasil mengikut pengguna.
- Memperibadikan penerangan hasil psikometrik serta cadangan aktiviti susulan tanpa mengubah skor atau kaedah pemarkahan instrumen.

### Tugasan yang tidak diserah kepada LLM

- Mengira kelayakan rasmi atau mengubah syarat kemasukan.
- Mengisi fakta tanpa citation dan bukti.
- Menilai psikometrik tanpa instrumen dan kaedah penskoran yang sah.
- Membuat keputusan kemasukan atau menjamin hasil kerjaya.

Setiap jawapan AI perlu memaparkan sumber, tarikh data, tahap kelengkapan dan pautan untuk semakan. Jika retrieval tiada bukti kukuh, jawab bahawa maklumat belum disahkan. Kurangkan data peribadi dalam prompt, jangan hantar keputusan/nama pelajar kecuali diperlukan dan dipersetujui. Simpan model/prompt version untuk kebolehulangan.

### Kemas kini merit UPU tanpa API rasmi

EduLaunch boleh memantau sumber rasmi UPU yang boleh dicapai secara automatik, seperti halaman kalkulator merit, FAQ, pekeliling atau PDF sesi akademik baharu. Proses ini mesti menghormati terma penggunaan, `robots.txt` dan kawalan akses laman; jangan memintas CAPTCHA, login atau sekatan bot. Jika pemantauan automatik tidak dibenarkan atau sumber tidak dapat dicapai, admin mengemas kini rekod secara manual berdasarkan dokumen rasmi.

- Simpan sumber, URL, sesi akademik, kategori calon, tarikh diterbitkan/diambil, hash dokumen dan versi formula.
- Pemantau berjadual mengesan perubahan pada halaman atau fail; perubahan mencetuskan draf dan notifikasi kepada penyemak, bukan terus mengubah formula aktif.
- Ekstrak formula, skala gred, komponen merit, kategori dan contoh pengiraan sebagai calon data. Paparkan petikan/halaman bukti bagi setiap medan.
- Penyemak membandingkan dengan sumber UPU, menguji contoh pengiraan, kemudian meluluskan versi baharu dengan tarikh kuat kuasa. Simpan sejarah dan pilihan untuk rollback.
- Jika struktur halaman/PDF berubah, formula tidak lengkap, atau keyakinan ekstraksi rendah, tandakan `pending_review`/`conflict` dan kekalkan versi lama dengan amaran kesegaran. Jangan mengira seolah-olah formula baharu telah disahkan.
- Bagi pelajar belum menduduki SPM, benarkan simulasi merit berasaskan gred sasaran. Bezakan dengan jelas antara simulasi, anggaran dan markah rasmi; komponen kokurikulum yang belum diketahui ditandakan anggaran/tidak tersedia.

## 7. Model data teras

- `Institution`: nama, domain rasmi, negara, status.
- `Source`: URL/API/fail, polisi, jenis, kekerapan, last_checked_at.
- `Program`: institusi, nama, tahap, bidang, kampus, tempoh, intake, status.
- `Requirement`: program/version, subjek/kelayakan, operator, nilai ambang, kumpulan syarat, tarikh kuat kuasa.
- `Evidence`: source, snapshot/hash, petikan atau halaman, captured_at.
- `Verification`: status, penyemak, keputusan, nota, masa, versi.
- `StudentProfile`: persetujuan, kelayakan, keputusan/subjek; akses terhad.
- `AssessmentInstrument` / `AssessmentInstrumentVersion`: sumber, lesen/kebenaran, bahasa, status draf/terbit/arkib dan versi kaedah skor.
- `AssessmentQuestion` / `AssessmentOption` / `ScoringRule`: bank soalan, pilihan jawapan, dimensi, aturan dan kaedah pemarkahan instrumen.
- `AssessmentSession` / `AssessmentAnswer` / `AssessmentResult`: `user_id`, versi instrumen/skor, kemajuan sesi, jawapan dan skor yang dikira sistem. Hasil lama kekal terikat pada versi asal.
- `Recommendation`: program, skor komponen, sebab, eligibility status, data version.
- `Career` / `PathwayNode` / `PathwayEdge`: kerjaya, nod pengajian/kemahiran dan hubungan laluan Malaysia; setiap hubungan menyimpan sumber, versi dan status pengesahan.
- `UserRoadmap`: `user_id`, tajuk, matlamat kerjaya, cabang pilihan dan versi aktif.
- `RoadmapVersion`: snapshot input profil/hasil penilaian, versi sumber dan rules, model/prompt version, sebab cadangan, status draf/disahkan sistem/perlu semak serta masa penjanaan.
- `RoadmapStep` / `RoadmapAlternative`: langkah dan cabang alternatif, prasyarat, sasaran subjek/gred, sumber bukti dan status kelayakan. Sasaran dipisahkan daripada keputusan sebenar.
- `RoadmapProgress`: `user_id`, langkah, status belum mula/dalam tindakan/selesai, catatan pengguna dan masa kemas kini. Penjanaan versi baharu tidak menimpa kemajuan lama.
- `AuditEvent`: tindakan sensitif dan perubahan data.

Syarat perlu menyokong kumpulan logik `AND`/`OR` serta kombinasi kelayakan yang nyata. Jangan anggap semua syarat boleh diwakili sebagai satu gred minimum.

## 8. Pemadanan dan roadmap

1. Tapis program dengan syarat yang telah disahkan dan intake/kampus yang relevan.
2. Jalankan rules engine untuk setiap syarat; hasilkan `eligible`, `not_eligible` atau `unknown` berserta sebab.
3. Susun cadangan berdasarkan padanan bidang/minat, pilihan pelajar, lokasi dan kos jika data tersedia. Asingkan skor kesesuaian daripada status kelayakan.
4. Jika tidak layak, cadangkan laluan alternatif hanya jika hubungan prasyarat dan sumbernya disahkan.
5. Paparkan cara ranking dibuat dan benarkan pelajar ubah keutamaan.

### 8.1 Penjanaan dan penyimpanan roadmap per pengguna

**Keputusan skop:** pengguna tidak perlu membina keseluruhan roadmap sendiri. Sistem menjana cadangan awal secara automatik menggunakan AI bersama rules engine dan graf laluan yang telah disahkan. Admin mengurus sumber dan hubungan laluan, bukan menulis roadmap bagi setiap pengguna.

1. Ambil profil akademik (keputusan sebenar atau sasaran), hasil psikometrik/aktiviti yang tersedia, matlamat kerjaya jika ada serta pilihan lokasi, kos dan pengajian. Jika pengguna belum tahu kerjaya, tawarkan beberapa arah penerokaan berserta sebab; jangan paksa satu destinasi.
2. Dapatkan nod program, kerjaya dan hubungan laluan Malaysia yang diluluskan. Semak kategori calon, intake dan prasyarat menggunakan enjin peraturan. Hubungan yang tidak mempunyai bukti tidak dilabel sebagai laluan yang sah.
3. AI menyusun draf berstruktur: langkah, beberapa cabang pengajian, sasaran subjek/gred, kemahiran, portfolio, pengalaman industri dan kerjaya yang boleh diteroka. Semua nod/prasyarat mesti merujuk ID dan bukti daripada data sistem; AI tidak mencipta syarat atau pemindahan kredit.
4. Backend mengesahkan skema hasil AI, rujukan sumber, kesinambungan cabang dan keputusan rules engine. Data tidak cukup menghasilkan status belum pasti atau permintaan melengkapkan profil. Jika AI gagal, gunakan laluan asas daripada graf yang disahkan atau benarkan cuba semula; jangan simpan draf gagal sebagai pelan yang disahkan.
5. Simpan roadmap yang lulus validasi dalam database dengan `user_id`, versi input/sumber, sebab cadangan dan masa penjanaan. Paparkan secara automatik dalam akaun pengguna; pengguna boleh memilih cabang, menukar matlamat dan menandakan kemajuan. Validasi sistem tidak bermaksud pengesahan tawaran oleh institusi.
6. Apabila keputusan, minat, pilihan atau syarat sumber berubah, sediakan cadangan versi baharu serta ringkasan perubahan. Pengguna memilih untuk mengaktifkannya; pilihan cabang dan kemajuan tidak ditimpa secara senyap.
7. Tetamu hanya melihat contoh roadmap statik yang telah disediakan; tiada penjanaan peribadi atau panggilan AI untuk tetamu. Log masuk diperlukan untuk menjana, menyimpan dan mengurus roadmap. API hanya membenarkan pengguna mengakses roadmap miliknya, tertakluk peranan yang dibenarkan.

Aliran ringkas: **profil + hasil penilaian → graf laluan Malaysia → rules engine → draf AI → validasi backend → simpan roadmap pengguna → paparan peta & kemajuan**.

### 8.2 Psikometrik: tanggungjawab admin dan automasi sistem

**Keputusan skop:** admin mengimport dan mengurus instrumen serta bank soalan yang dibenarkan; admin tidak perlu mencipta soalan dari kosong atau menjalankan ujian secara manual bagi setiap pengguna. Instrumen dan kebenaran penggunaannya perlu dimuktamadkan sebelum diterbitkan.

| Pihak | Tanggungjawab |
|---|---|
| Admin/editor | Import soalan/pilihan, rekod sumber dan kebenaran, urus bahasa serta sediakan versi draf instrumen dan aturan skor |
| Penyemak yang sesuai | Semak kesetiaan kepada instrumen asal, kebenaran, terjemahan dan kaedah pemarkahan sebelum kelulusan penerbitan |
| Sistem | Cipta sesi pengguna, paparkan soalan mengikut aturan instrumen, simpan jawapan/kemajuan, kira skor deterministik, simpan hasil dan hubungkan kepada cadangan serta roadmap |
| AI | Terangkan hasil dalam bahasa mudah dan cadangkan refleksi/aktiviti susulan daripada kandungan dibenarkan; tidak menentukan atau menukar skor psikometrik |
| Pengguna | Jawab soalan, sambung sesi tertangguh, semak hasil dan pilih langkah penerokaan seterusnya |

- Soalan dan aturan psikometrik tidak dijana bebas oleh AI pada setiap sesi. Soalan refleksi yang dijana AI dilabel sebagai penerokaan tambahan dan diasingkan daripada skor instrumen.
- Pemilihan, turutan, pengacakan atau aliran adaptif hanya digunakan jika kaedah instrumen membenarkannya; jangan menukar instrumen semata-mata untuk variasi paparan.
- Pengiraan skor hanya berlaku apabila syarat kelengkapan instrumen dipenuhi. Jawapan tertinggal atau sesi terputus tidak dianggap hasil lengkap; pengguna boleh menyambung sesi.
- Setiap sesi dipautkan kepada versi instrumen dan aturan skor. Perubahan bank soalan menghasilkan versi baharu; hasil pengguna terdahulu tidak diubah tanpa rekod dan alasan yang jelas.
- Skor dan jawapan disimpan dalam database pengguna dengan kawalan akses. Penerangan AI boleh dijana semula tanpa mengubah skor asal. Jika AI tidak tersedia, paparkan skor dan penerangan asas yang diluluskan.
- Selesai penilaian mencetuskan penjanaan cadangan/roadmap atau menawarkan kemas kini versi pelan sedia ada. Penilaian membantu penerokaan; ia tidak menentukan kebolehan mutlak atau menjamin kerjaya.

## 9. Keselamatan, privasi dan tadbir urus

- Kumpul data minimum; persetujuan jelas, tujuan penggunaan, tempoh simpanan dan mekanisme padam/eksport.
- Lindungi keputusan akademik dan penilaian dengan kawalan akses role-based, TLS, enkripsi storan dan backup.
- Jangan log token, kata laluan atau kandungan peribadi penuh.
- Pisahkan data demo daripada data sebenar; gunakan data sintetik untuk demonstrasi.
- Sediakan log audit bagi perubahan syarat dan keputusan semakan.
- Semak keperluan undang-undang/polisi universiti dan pengendalian data pelajar bersama penyelia sebelum memproses data sebenar.

## 10. Fasa pembangunan

### Fasa 0 — Pengesahan skop

Pilih institusi dan program terhad untuk demonstrasi, sahkan sumber yang dibenarkan, definisi kelayakan, instrumen psikometrik dan bentuk data profil.

### Fasa 1 — Asas aplikasi

Sediakan repo, UI, auth/role, PostgreSQL, model institusi/program/sumber dan data demo.

### Fasa 2 — Katalog dan kurasi

Bina carian program, halaman butiran, import manual/CSV, panel semakan dan provenance setiap medan.

### Fasa 3 — Profil dan kelayakan

Bina input keputusan serta rules engine deterministik dengan keputusan `eligible/not_eligible/unknown` dan sebab yang boleh diaudit.

### Fasa 4 — Penilaian dan cadangan

Tambah import/penerbitan instrumen versi terkawal, sesi penilaian automatik, penyimpanan jawapan dan pengiraan skor deterministik. Bina ranking telus, graf laluan Malaysia serta penyimpanan roadmap, cabang dan kemajuan mengikut pengguna.

### Fasa 5 — Automasi pengambilan

Tambah ingestion satu sumber pada satu masa, ekstraksi dokumen kepada draf, pemantauan perubahan dan queue semakan manual. Ukur ketepatan mengikut medan sebelum tingkatkan automasi.

### Fasa 6 — Pembantu AI dan penambahbaikan

Tambah RAG bersumber selepas katalog/provenance stabil, kemudian penjanaan roadmap peribadi berstruktur oleh AI dengan validasi backend, penyimpanan versi dan pengemaskinian terkawal. Tambah penerangan AI bagi hasil psikometrik tanpa mengubah skor. Nilai kualiti, kos, latency dan kadar jawapan tanpa bukti; baiki UX dan keselamatan berdasarkan maklum balas pengguna.

## 11. Kriteria penerimaan MVP

- Pengguna boleh melengkapkan profil, penilaian minat dan melihat ringkasan hasil.
- Admin boleh mengimport, menyemak dan menerbitkan versi instrumen dibenarkan; sistem menjalankan sesi dan mengira skor tanpa campur tangan admin bagi setiap pengguna.
- Sesi tidak lengkap boleh disambung; setiap hasil mengekalkan versi instrumen dan kaedah skor yang digunakan.
- Sistem menjana roadmap peribadi daripada data laluan disahkan, memvalidasi hasil AI dan menyimpannya bersama `user_id`, sebab cadangan, cabang, bukti dan versi.
- Pengguna boleh membuka semula roadmap dan kemajuan selepas log masuk pada peranti lain; pengguna lain tidak boleh mengakses pelan tersebut.
- Penjanaan versi baharu tidak menimpa cabang atau kemajuan sedia ada tanpa pilihan pengguna; hasil AI yang gagal validasi tidak diterbitkan sebagai roadmap disahkan.
- Pengguna boleh mencari dan membandingkan program daripada set institusi yang dipersetujui.
- Setiap syarat yang diterbitkan mempunyai sumber, tarikh semakan dan status verifikasi.
- Formula merit UPU disimpan mengikut sesi/kategori, disertakan provenance dan hanya diaktifkan selepas semakan; pengguna boleh membuat simulasi sasaran sebelum keputusan SPM.
- Kelayakan dikira secara deterministik; nilai hilang/rekod belum disahkan memberi status `unknown`.
- Sistem memaparkan sebab keputusan dan sumber yang boleh dibuka.
- Admin boleh membetulkan, meluluskan dan melihat sejarah perubahan rekod.
- Cadangan memisahkan kelayakan daripada kesesuaian dan tidak menjanjikan kemasukan.
- AI tidak menjawab fakta program tanpa bukti yang dipaparkan.

## 12. Idea penambahbaikan yang boleh menonjol

1. **Requirement change radar:** banding versi baharu dengan versi lama dan maklumkan penyemak tentang perubahan gred/tarikh.
2. **Evidence-first profile:** setiap fakta syarat boleh diklik ke petikan PDF/halaman asal; tunjuk halaman dan tarikh tangkapan.
3. **What-if planner:** ubah keputusan atau pilihan lokasi untuk melihat bagaimana senarai pilihan berubah, tanpa menyimpan perubahan sehingga disahkan pengguna.
4. **Gap-to-pathway map:** tunjuk syarat yang belum dipenuhi dan pilihan kursus jambatan/laluan alternatif dengan bukti.
5. **Explainable matching:** pecahkan skor kepada minat, kelayakan, lokasi dan faktor lain; pengguna boleh laras pemberat.
6. **UPU merit update tracker:** pantau halaman dan pekeliling rasmi UPU walaupun tiada API; kesan perubahan formula merit, sediakan draf versi baharu, dan terbitkan hanya selepas pengesahan manusia. Jika akses automatik disekat atau ekstraksi tidak pasti, minta admin masukkan formula secara manual daripada dokumen rasmi.
7. **Freshness indicator:** lencana kesegaran dan amaran rekod lapuk pada setiap program.
8. **Counsellor view:** ringkasan perbandingan yang mudah dikongsi/eksport dengan persetujuan pelajar.
9. **Multilingual interface:** BM dan English; pastikan terjemahan syarat tidak menggantikan teks rasmi asal.
10. **Accessibility & low-bandwidth mode:** reka bentuk mudah alih, kontras baik dan halaman ringan untuk capaian lebih luas.
11. **Data quality dashboard:** kadar medan disahkan, konflik, rekod lapuk dan ketepatan ekstraksi berdasarkan sampel yang disemak manusia.

## 13. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Syarat berubah atau sumber bercanggah | Versi, tarikh semakan, sumber autoritatif dan status konflik; tahan rekod daripada digunakan |
| OCR/LLM salah membaca dokumen | Draf sahaja, bukti per halaman, validasi skema dan semakan manusia untuk syarat kritikal |
| Scraping disekat atau tidak dibenarkan | Semak polisi, jangan pintas sekatan; beralih ke API/fail rasmi atau input manual |
| Formula merit UPU berubah antara sesi | Simpan versi mengikut sesi, kesan perubahan secara berjadual, uji contoh rasmi dan wajibkan kelulusan manusia sebelum aktif |
| Cadangan nampak berat sebelah | Terangkan kriteria, asingkan skor minat dan kelayakan, beri kawalan pilihan pengguna |
| Kos dan latensi LLM | Cache jawapan umum, had token, model kecil untuk tugas mudah dan fallback tanpa AI |
| Skop terlalu besar | Hadkan MVP kepada institusi/program terpilih; tambah sumber secara berperingkat |
| Kebocoran data pelajar | Minimisasi data, kawalan akses, secret management, backup dan data sintetik untuk demo |

## 14. Keputusan yang perlu dimuktamadkan pasukan

- Senarai institusi/program sasaran dan bilangan rekod MVP.
- Sumber data yang dibenarkan serta kaedah semakan rasmi.
- Kelayakan yang disokong: SPM, IGCSE, STPM, matrikulasi, diploma atau kombinasi tertentu.
- Instrumen minat/psikometrik dan kebenaran penggunaannya.
- Sama ada pelajar memuat naik slip keputusan atau memasukkan data manual.
- Pembekal LLM dan polisi penghantaran/pengekalan data.
- Hosting, domain dan bajet operasi.
- Kaedah penilaian kejayaan serta pembahagian kerja kumpulan.

## 15. Perincian reka bentuk dan dokumen pelajar (20 Oktober 2026)

Permintaan terkini menetapkan muat naik slip sebagai aliran yang perlu direka, bersama input manual. Aliran: pilih fail → persetujuan → muat naik/pemprosesan → paparan sumber PDF dan medan diekstrak → semakan setiap subjek/gred → sahkan transkripsi → simpan profil → semak kelayakan. Pengesahan pelajar tidak membuktikan ketulenan sijil. Fail kabur, berkunci, terlalu besar atau gagal diproses mempunyai pilihan cuba lagi dan input manual. PDF/JPG/PNG dan had 10 MB ialah cadangan UI untuk dimuktamadkan semasa pembangunan.

Website awam mempunyai landing formal, tentang kami, panduan/FAQ, privasi/terma, hubungi kami dan log masuk. Portal pelajar dibezakan daripada website awam; aplikasi mobile mempunyai halaman Figma tersendiri. Pelan Starter mengehadkan fail kepada tiga halaman, maka admin, jenama dan workflow diletakkan bersama.

Roadmap menunjukkan cabang selepas SPM melalui STPM/matrikulasi, asasi atau diploma, seterusnya pengajian berkaitan, portfolio/latihan industri dan pilihan kerjaya. Laluan contoh bukan pengesahan kemasukan atau pemindahan kredit. Bilangan A sahaja tidak menentukan kelayakan; sasaran mesti pada peringkat subjek, kategori dan syarat program.

Rimau mempunyai pose menyambut, berfikir, menunjukkan arah dan meraikan kejayaan. Aset ialah render raster bergaya 3D; animasi rangka 3D memerlukan model dan rig berasingan. Figma menyediakan reka bentuk dan sebahagian navigasi prototaip; pemprosesan PDF, penghantaran borang, log masuk dan pengiraan sebenar memerlukan backend.

## 16. Akses awam dan pentadbiran diperluas

### Akses awam sebagai mukadimah — keputusan skop terkini
- Halaman awam: pengenalan EduLaunch, cara berfungsi/FAQ, tentang kami, hubungi, privasi/terma dan log masuk/pendaftaran.
- Landing memaparkan manfaat, visual bidang dan contoh roadmap yang telah disediakan; tiada input keputusan, muat naik fail atau penjanaan AI berlaku untuk tetamu.
- Navbar awam: **Utama · Cara berfungsi · Tentang kami · Hubungi · Log masuk**, dengan garis kuning di bawah navbar.
- CTA utama: **Log masuk untuk bermula**. CTA ciri pada pratonton membawa ke login; pilihan visual statik boleh ditukar tanpa memanggil backend AI.
- Selepas login: direktori universiti/program, syarat bersumber, perbandingan maksimum tiga program, semakan kelayakan, simulasi merit, psikometrik, aktiviti/refleksi, PDF, pembantu AI, cadangan dan roadmap peribadi.
- Pengguna tidak perlu berstatus pelajar untuk mendaftar. Ibu bapa, kaunselor dan orang awam boleh menggunakan portal selepas login.
- Aliran: landing → kenali fungsi/pratonton → login/daftar → dashboard → pilih tugas → hasil disimpan mengikut pengguna.
- Pautan permohonan rasmi disediakan dalam portal; EduLaunch tidak menghantar permohonan UPU atau menjamin tawaran.
- Akses melalui akaun tidak bermaksud ciri berbayar. Sebarang pakej berbayar memerlukan keputusan produk berasingan.

### Skrin dan tindakan admin
| Skrin | Paparan | Tindakan |
|---|---|---|
| Dashboard | KPI program diterbitkan, perlu semak, lapuk, sumber gagal; graf trend pelawat dan kesihatan data | Tapis tempoh/institusi, buka senarai berkaitan, eksport ringkasan |
| Universiti & kampus | Jadual nama, jenis, negeri, kampus, status | Tambah/edit, kaitkan sumber, arkib dengan semakan kesan |
| Program & intake | Kod, nama, peringkat, kampus, sesi, status penerbitan | Tambah/edit draf, salin intake, tutup intake, lihat sejarah |
| Syarat & kelayakan | Syarat am/khas, kategori, subjek, gred, hubungan AND/OR, pengecualian | Edit draf, pratonton kes calon, hantar semakan, lulus/tolak |
| Sumber & automasi | Jadual job, kali terakhir berjaya, perubahan, kegagalan, sekatan akses | Jalankan semula, jeda, import fail, beralih manual |
| Barisan pengesahan | Sumber asal bersebelahan ekstraksi, diff versi, konflik | Betulkan, minta bukti, tolak, lulus dan terbit ikut peranan |
| Formula merit | Sesi, kategori, komponen, pemberat, sumber dan versi | Draf formula, semak kes rujukan, kelulusan dan aktifkan versi |
| Psikometrik & cadangan | Versi soalan/skor, kadar selesai agregat, maklum balas cadangan | Urus instrumen dibenarkan, pratonton, terbit versi; perubahan skor perlu penyemak |
| Roadmap & kerjaya | Graf program/prasyarat/kerjaya dan bukti hubungan | Tambah nod/cabang, semak pautan, nyahterbit laluan tidak sah |
| Pengguna & akses | Status akaun, peranan, permintaan privasi | Jemput staf, hadkan akses, tangguh akaun dengan sebab, proses padam/eksport |
| Kandungan & sokongan | FAQ, pengumuman, mesej hubungan, laporan data salah | Draf/terbit, agih tiket, jawab, tutup dengan rekod tindakan |
| Audit & operasi | Siapa ubah apa, masa, versi, kejadian gagal, storan dan kos pemprosesan | Cari/tapis, eksport audit, pemulihan versi melalui kelulusan |

### Graf yang berguna
1. Trend pelawat awam dan pengguna berdaftar (mingguan/bulanan; definisi kiraan jelas).
2. Funnel: lawatan landing → login/daftar → lihat program → banding → semak kelayakan → simpan. Bezakan trafik awam daripada penggunaan akaun; tiada ranking individu.
3. Kesihatan data: verified, pending_review, conflict, stale, unavailable. Status tidak ditindih supaya jumlah konsisten.
4. Kejayaan ingestion: job berjaya/gagal, tempoh pemprosesan dan barisan tertunggak.
5. Program/bidang paling diteroka berdasarkan paparan agregat, bukan bukti peluang kemasukan.
6. Masa semakan dan umur kes tertunggak mengikut keutamaan.
Setiap graf ada tempoh, unit, legenda, keadaan kosong/gagal dan paparan jadual alternatif. Klik kategori membuka rekod yang ditapis. Data demonstrasi ditanda jelas; sistem sebenar tidak memaparkan nombor rekaan.

### Kawalan operasi
- Editor boleh menyunting draf; penyemak meluluskan data; superadmin mengurus akses; sokongan melihat maklumat minimum. Penyunting syarat kritikal tidak meluluskan perubahannya sendiri.
- Analitik menggunakan data agregat; admin tidak mendapat akses menyeluruh kepada slip atau jawapan psikometrik secara lalai.
- Perubahan syarat/merit mesti melalui bukti → semakan → versi diterbitkan. Rekod audit kekal; tindakan arkib mempunyai ringkasan kesan dan pengesahan.
- Antara muka admin desktop menggunakan sidebar tetap, filter bar, jadual kerja, drawer butiran dan sejarah tindakan. Mobile admin hanya ringkasan/notifikasi sebagai skop kemudian.

### Status reka bentuk
Perubahan seksyen 16 belum diselaraskan ke Figma kerana had panggilan MCP pelan Starter dicapai. Pratonton lokal disediakan untuk arah dashboard dan portal awam; ia menggunakan data sintetik, bukan backend sebenar.

## 17. Tingkah laku prototaip landing awam terdahulu

> Rekod iterasi terdahulu. Akses tetamu kepada alat interaktif dalam seksyen ini telah digantikan oleh dasar login pada seksyen 16 dan 20; pratonton lokal belum diselaraskan dengan dasar terkini.

Pratonton lokal dikembangkan dengan tiga slaid hero (penerokaan, minat, roadmap), navigasi sebelumnya/seterusnya, pemilih slaid dan kawalan jeda. Putaran berhenti apabila pointer/fokus berada pada carousel, dialog dibuka atau tab tidak aktif. Reduced motion mematikan animasi dan putaran automatik awal.

Carian hero memindahkan kata kunci/penapis ke katalog. Penapis katalog digabungkan, bilangan hasil dikemas kini dan carian kosong memberikan tindakan reset. Profil institusi membuka program institusi tersebut. Perbandingan mengekalkan sehingga tiga pilihan dalam sesi, memerlukan sekurang-kurangnya dua, dan memaparkan syarat/atribut secara bersebelahan.

Semakan tetamu menggunakan rules contoh per program: gred minimum setiap subjek, jumlah kepujian serta syarat tambahan yang tidak boleh diandaikan. Medan kosong menghasilkan status unknown; jurang gred menghasilkan fail; syarat dipenuhi hanya untuk contoh. Jumlah kepujian tidak boleh kurang daripada bilangan subjek kepujian yang pengguna sudah masukkan. Sasaran dan keputusan sebenar mempunyai konteks hasil berbeza. Data ini tidak memberi jaminan tawaran.

Penerokaan minat ringkas menggunakan tiga soalan demonstrasi, pilihan belum pasti, keadaan seri dan refleksi aktiviti. Ia bukan instrumen psikometrik yang sah. Roadmap membolehkan pertukaran cabang Diploma/Asasi/STPM, kembali kepada sasaran gred dan meneroka kerjaya.

Pemilihan fail menyemak sambungan, saiz dan fail kosong selepas persetujuan. Tiada fail dihantar, OCR dijalankan atau bacaan direka. Profil demonstrasi dan borang hubungan tidak menyamar sebagai akaun atau penghantaran sebenar. Keadaan disimpan dalam memori tab sahaja; tiada data peribadi kekal selepas muat semula.

Fail pratonton: outputs/design/portal-admin-preview.html, public-portal.css dan public-portal.js. Ini memperincikan aliran front-end; Figma masih menunggu akses MCP tersedia semula. Ujian automatik tidak ditambah atau dijalankan kerana tidak diminta.

## 18. Penyelarasan Figma terkini

Akses Figma tersedia semula dan reka bentuk telah dikemas kini terus dalam fail bQkW6wXk8GHhfMM7sGJjDW. Landing mempunyai tiga keadaan carousel yang boleh dinavigasi secara manual, komposisi hero Rimau, pintu masuk tetamu dan pautan kepada direktori, perbandingan serta semakan kelayakan contoh. Reka bentuk menggunakan panduan design-taste-frontend dan ui-ux-pro-max dengan identiti navy/kuning/putih.

Admin mempunyai dashboard operasi (graf sesi, metrik dan kesihatan data), serta lapan halaman: universiti/program, syarat/pengesahan, sumber/automasi, formula merit, psikometrik/roadmap, pengguna/peranan, sokongan/kandungan dan audit/operasi. Sidebar, metrik dan beberapa tindakan utama dihubungkan dalam prototaip. Jadual mengandungi data sintetik. Butang dan keadaan prototaip menunjukkan navigasi; belum mewakili CRUD, pengesahan akses atau pemprosesan backend sebenar.

Pautan semakan reka bentuk: landing node 5:2, dashboard admin node 38:59. Visual landing dan dashboard disemak melalui tangkapan skrin Figma; isu penskalaan pose dan kandungan dashboard terpotong telah dibaiki.

## 19. Penambahbaikan visual seluruh sistem

Figma dikemas kini dengan enam pose Rimau baharu (laptop, semakan bukti, navigator, artis, saintis, sokongan) dan enam ilustrasi kontekstual (teknologi, reka bentuk, sains, kampus, dokumen dan laluan). Aset dijadikan komponen perpustakaan untuk variasi mengikut tugasan, bukan penggunaan satu gambar pada semua skrin.

Dashboard pelajar disusun semula kepada langkah utama, perjalanan, akses profil/PDF, direktori, roadmap dan aktiviti. Login menggunakan komposisi berasingan untuk visual dan borang. Katalog menggunakan ilustrasi bidang; halaman maklumat dan aliran dokumen mempunyai panduan serta langkah seterusnya. Mobile diperhalus untuk visual aktiviti, variasi pose dan ruang navigasi yang mengikut ketinggian kandungan.

Setiap modul admin mendapat insight berkaitan: liputan katalog, umur semakan, kesihatan job, kesiapsiagaan formula, penerokaan aktiviti agregat, matriks akses, keadaan tiket dan jejak operasi. Graf menggunakan data sintetik berlabel. Akses dan tindakan contoh dihubungkan kepada skrin berkaitan; ini masih prototaip reka bentuk dan navigasi.


## 20. Akses berasaskan akaun dan kawalan penggunaan

**Keputusan pengguna terkini:** public page ialah mukadimah produk. Semua alat aplikasi memerlukan login, khususnya fungsi yang mempunyai kos AI, OCR, pemprosesan fail dan penyimpanan peribadi. Seksyen ini menggantikan cadangan terdahulu untuk semakan/cadangan tetamu.

| Fungsi | Tetamu | Selepas login |
|---|---|---|
| Pengenalan, FAQ, tentang, hubungi, privasi | Ya | Ya |
| Ilustrasi/pratonton bidang dan contoh roadmap siap sedia | Ya; kandungan statik/cache | Ya |
| Direktori, syarat program dan perbandingan | Pratonton sahaja | Akses portal |
| Semakan keputusan, sasaran dan merit | Tiada input/pengiraan tetamu | Ya; rules/formula diluluskan |
| Psikometrik dan sejarah hasil | Pratonton cara berfungsi | Sesi dan skor per pengguna |
| PDF/OCR dan input manual | Tiada muat naik tetamu | Persetujuan, semakan dan simpanan pengguna |
| Pembantu AI, cadangan dan roadmap peribadi | Tiada panggilan model | Ya; tertakluk kawalan penggunaan |

### Penguatkuasaan backend
- Middleware mengesahkan sesi bagi semua halaman dan endpoint portal; setiap permintaan AI/OCR turut mengesahkan pengguna dan akses kepada rekod. Endpoint tidak boleh dicapai hanya dengan mengetahui URL atau memanggil API secara terus.
- Public landing menggunakan kandungan siap sedia atau cache. Menukar slaid, tab contoh atau melihat roadmap contoh tidak mencetuskan inference AI atau job OCR.
- API key model dan storan kekal di server. URL muat naik bertempoh hanya dikeluarkan selepas pemeriksaan sesi, saiz/format, kuota dan pemilikan dokumen.
- Tetapkan had permintaan serta kuota AI/OCR per pengguna, had serentak, had token/fail dan bajet global melalui konfigurasi. Nilai sebenar ditentukan selepas pengukuran kos; jangan menjanjikan penggunaan tanpa had.
- Tempah kuota secara atomik sebelum job diterima supaya permintaan serentak tidak melepasi had. Gunakan idempotency key dan deduplikasi untuk mengelakkan klik berulang/retry menghasilkan job serta caj berganda. Laraskan semula kuota bagi job yang tidak diproses mengikut polisi.
- Simpan hasil dan roadmap dalam database; membuka hasil sedia ada tidak menjana semula jawapan. Cache hanya digunakan apabila versi profil, instrumen dan sumber masih sepadan; jangan kongsi data peribadi merentas pengguna.
- Jika sesi tamat, minta login sebelum meneruskan operasi. Jika kuota penuh, paparkan status serta masa pemulihan jika tersedia dan benarkan pengguna melihat hasil tersimpan; jangan mula job berbayar secara senyap.
- Ukur penggunaan, kegagalan dan anggaran kos pada admin secara agregat. Kawalan akses, kuota dan budget guard mesti dikuatkuasakan di server, bukan sekadar menyembunyikan menu.

### Reka bentuk dan penerimaan
- Navbar awam tidak menyenaraikan alat aplikasi. Navbar portal memberikan akses program, roadmap, merit dan profil selepas login.
- Public CTA kepada ciri menuju login. Selepas autentikasi, pengguna dibawa ke dashboard atau destinasi asal yang telah disahkan sebagai laluan dalaman yang dibenarkan.
- Paparan prototaip Figma telah diselaraskan: pratonton awam tidak mempunyai pautan terus ke alat aplikasi; login prototaip membawa ke dashboard. Sekatan sebenar memerlukan backend dan tidak dijamin oleh pautan Figma.
- Kriteria penerimaan: permintaan tanpa sesi tidak memulakan job AI/OCR; akses silang pengguna ditolak; permintaan berganda tidak menambah job; had penggunaan dipatuhi; membuka hasil tersimpan tidak memanggil model semula.

## 21. Reka bentuk semula admin dan penyelarasan web ↔ mobile (20 Oktober 2026)

### Admin v2 — mudah dipelajari untuk pengguna kali pertama
Section Figma **ADMIN v2 · Mudah dipelajari** (halaman 00) menggantikan arah admin terdahulu sepenuhnya.
- **Sidebar dikumpul ikut tugas:** Kerja hari ini (Ringkasan, Peti tugasan) · Data kemasukan · Sumber data · Pengalaman pengguna · Pentadbiran. Ikon + label, item aktif ditanda, bilangan hanya pada barisan yang perlu tindakan. Kad "Anda log masuk sebagai…" menerangkan peranan semasa.
- **Setiap skrin menjawab satu soalan dahulu.** Ringkasan: "Apa yang perlu saya buat hari ini?" — senarai tugasan dengan sebab, status, umur dan butang Semak; status katalog diterangkan dalam bahasa mudah.
- **Peti tugasan** menggantikan "Barisan pengesahan": tab Untuk saya/Semua/Dipulangkan/Selesai, penapis, jadual dengan sebab dan penyedia, jalur "Bila anda klik Semak" dan maksud status.
- **Semak rekod:** aliran 5 langkah (anda di sini), sumber rasmi bersebelahan draf, medan berubah ditanda, senarai semak, dan setiap keputusan menyatakan akibatnya kepada pengguna. Peraturan "tidak meluluskan suntingan sendiri" dipaparkan.
- **Pembelajaran:** dialog sambutan log masuk pertama (3 perkara penting + boleh/tidak boleh ikut peranan), lawatan berpandu 3 langkah, kad panduan permulaan 4 langkah pada Ringkasan, dan papan **Peta ruang admin** (fungsi setiap menu, siapa, hasil, maksud status, peranan).
- **Templat modul** (Universiti & program): tajuk + ayat penerangan, tindakan utama kanan atas, tab berbilang, penapis, jadual, keadaan kosong dan "Cara modul ini berfungsi". Modul lain mengikut templat yang sama.
- **Modul terperinci:** Syarat kemasukan (pembina kumpulan DAN/ATAU, sumber per syarat, pratonton kes calon, kesan kepada pengguna), Formula merit (versi ikut sesi/kategori, komponen 100%, senarai kesediaan, kes rujukan dijangka vs dikira), Sumber & import (job 7 hari, sumber gagal, polisi pengambilan), Psikometrik (versi & lesen, perubahan soalan, kadar selesai agregat), Roadmap & kerjaya (graf laluan, pautan tanpa bukti, roadmap terjejas), Pengguna & peranan (staf, matriks akses, permintaan privasi), Sokongan & laporan (peti tiket, pautan ke rekod, balasan), Jejak audit (log ikut rekod, perbezaan, minta pemulihan).
- **Aliran keputusan & editor:** dialog Pulangkan (sebab + medan), Tolak (sebab wajib), Sahkan penerbitan (kesan kepada pengguna), Berjaya diterbitkan (tugasan seterusnya); editor melihat draf dipulangkan; borang Tambah sumber rasmi (semakan polisi automatik), Input manual dengan bukti, Sunting program & intake, wizard Import instrumen (4 langkah).
- 34 frame admin lama (aliran demonstrasi REQ-027 dan 8 modul terdahulu) telah dibuang kerana digantikan sepenuhnya oleh v2; boleh dipulihkan melalui sejarah versi Figma jika perlu.
- Komponen baharu: `Admin v2 / Sidebar`, `Admin v2 / Status` (6 status), `Admin v2 / Butang` (Utama, Kedua, Garis, Bahaya). Prototaip dipautkan; titik mula aliran: "Admin v2 · log masuk pertama".

### Penyelarasan web ↔ mobile
Papan **SYNC · Web ↔ Mobile** (halaman 00) memetakan 18 kumpulan fungsi kepada skrin web dan mobile.
- Tab bar mobile kini 5 item sama seperti web: Utama · Teroka · Roadmap · **Merit Lab** · Profil (27 tab bar dikemas kini). Tab/menu aktif dibetulkan pada setiap skrin web dan mobile.
- Ditambah pada kedua-dua platform: **Sesi anda telah tamat** dan **Had penggunaan AI dicapai** (masa pemulihan + fungsi tanpa AI), mengikut seksyen 20.
- Ditambah pada mobile: **Bantuan & maklumat** (panduan/FAQ, tentang, privasi & terma, hubungi) melalui Profil.
- Nilai contoh untuk dimuktamadkan: tamat sesi 30 minit, had 20 permintaan AI sehari, bilangan rekod/tugasan dan nama staf dalam admin adalah data demonstrasi.

## 22. Watak Rimau, landing komersial dan navigasi portal (21 Oktober 2026)

### Rimau — 12 pose mengikut halaman
Perpustakaan **Visual library / Rimau pose v2** (halaman 00) menambah 12 pose yang dijana dengan Figma AI (latar dibuang): Melambai (landing, log masuk), Membaca (panduan/FAQ), Berfikir (psikometrik), Kalkulator (Merit Lab), Telefon & laptop (web + mobile), Perisai (privasi, sesi tamat), Sokongan (hubungi), Muat naik (dokumen), Membanding (banding program), Luar talian (ralat), Jam pasir (had penggunaan AI, pemprosesan) dan Peta laluan (roadmap). Pose dipadankan pada 17 skrin web dan 12 skrin mobile.

### Landing v2 (halaman 01, section LANDING v2)
Navbar tetap → hero dengan pratonton UI → banner nama universiti awam yang bergerak → "Satu platform, tiga titik mula" (tab interaktif) → empat langkah → kalendar perancangan → carousel sorotan (anak panah, titik, auto 5 saat) → teroka bidang (kad hover) → web + mobile → janji kami → FAQ akordion → CTA → footer.
- **Tiada dakwaan kerjasama atau logo institusi/kerajaan.** Banner menyenaraikan nama institusi sebagai liputan katalog dengan penafian "tidak bergabung dengan, atau disahkan oleh". Logo hanya boleh ditambah selepas ada kebenaran bertulis.
- Footer mengandungi Terma & syarat, Dasar privasi, Notis PDPA 2010, Dasar kuki, Penafian, Pernyataan aksesibiliti, hubungan, media sosial dan pilihan bahasa BM/EN.
- Ayat awam yang menyebut UPU/PTPTN diganti: "Platform perancangan pendidikan dan kerjaya yang berpandukan maklumat rasmi."

### Navigasi selepas log masuk
- **Web:** komponen `Portal / Sidebar pelajar` (Penuh 272px / Kecil 80px, boleh ditogol) dikumpul ikut tujuan — Teroka, Rancang, Kenali diri, Dokumen & bantuan — dengan carian pantas, lencana bilangan, baki kuota AI, kemajuan profil, kemas kini dan menu pengguna. Contoh: **W02 v2 / Dashboard pelajar**.
- **Mobile:** bar atas (carian, kemas kini, Semua alat) pada 19 skrin log masuk dan helaian **Semua alat** yang mengikut kumpulan sidebar web; tab bawah kekal 5 item.
- **Penukaran selesai (21 Okt 2026):** semua 41 skrin portal web log masuk kini menggunakan `Portal / Sidebar pelajar` (bar atas lama dibuang). Kandungan dialih ke kawasan 1088px selepas sidebar; item aktif ditanda mengikut modul skrin dan setiap item sidebar dipautkan dalam prototaip (titik mula aliran: "Portal pelajar · sidebar").
- W02 lama dibuang; **W02 / Dashboard pelajar · sidebar** menggantikannya dan semua pautan ke W02 lama dialihkan.
- Skrin awam (log masuk, cipta akaun, pulih akses, semak peti masuk) kekal dengan navigasi awam.
- **Pembersihan (21 Okt 2026):** P01 / Public landing · carousel 1–3 dan P01d dibuang kerana sudah diganti oleh **Landing v2**; 18 pautan logo/"Utama" pada halaman awam kini menuju ke Landing v2. Di halaman 00, 10 komponen butang yang tidak digunakan dan pose lama Rimau / Thinking & Celebrating (diganti oleh pose v2) dibuang. Skrin ralat/keadaan khas (fail tidak dapat dibaca, sesi tamat, had AI, luar talian) dikekalkan kerana ia keadaan sistem, bukan halaman lebihan.
- **Susunan fail Figma (21 Okt 2026):** setiap halaman bermula dengan kad "Panduan fail". Website dan Mobile disusun dalam section bernombor yang sama — 1 · Laman awam (web sahaja), 2 · Mula & akaun, 3 · Utama & profil, 4 · Teroka program, 5 · Kelayakan & Merit Lab, 6 · Kenali diri, 7 · Roadmap, 8 · Dokumen akademik, 9 · Tanya AI bersumber, 10 · Keadaan sistem — dengan skrin kiri → kanan mengikut turutan pengguna. Halaman 00: A · Jenama & aliran produk, B · Pustaka visual & komponen, C · Admin (v2), D · Penyelarasan web ↔ mobile.
- **Navbar & footer seragam (21 Okt 2026):** komponen `Web / Navbar awam` dan `Web / Footer awam` (dari Landing v2) kini dipakai pada landing dan 9 halaman awam/akaun; "Public masthead", "Public navigation / V3" dan footer lama dibuang. Pautan halaman semasa ditanda kuning; navbar tetap di atas semasa skrol. Mobile: `Mobile / Bar atas` (Log masuk / Awam) pada semua 52 skrin dan `Mobile / Tab bawah` (Aktif = Utama, Teroka, Roadmap, Merit Lab, Profil, Tiada) dengan tab aktif mengikut modul. Skrin tugasan berfokus (soalan ujian, muat naik dokumen, aktiviti penerokaan) sengaja tanpa tab bawah. Portal web log masuk kekal dengan `Portal / Sidebar pelajar`.
- **Penapis carian program (21 Okt 2026):** penapis Lokasi/negeri dan Jenis institusi dibuang. Penapis kini: **Universiti** dan **Bidang / jurusan** (komponen `Combobox / Universiti` dan `Combobox / Bidang` — gabungan dropdown + carian: klik untuk buka senarai, taip untuk tapis, padanan ditebalkan, bilangan padanan dipaparkan) serta **Peringkat** (dropdown biasa kerana pilihannya sedikit). Senarai universiti dan bidang datang daripada rekod yang didaftarkan admin (modul Universiti & program); institusi yang belum berdaftar tidak dipaparkan. Keadaan: Tertutup → Terbuka → Dipilih (× untuk kosongkan), boleh diklik dalam prototaip. Dipakai pada W / Cari program mengikut pilihan, direktori program (2 skrin), M / Cari program mengikut pilihan; cip W03 "Lokasi" ditukar kepada "Universiti".
- **Footer awam (21 Okt 2026):** `Web / Footer awam` hanya memaut halaman yang boleh dibuka tanpa log masuk — *Sumber* (Cara berfungsi, Kalendar perancangan, Panduan & FAQ, Aplikasi web & mobile), *EduLaunch* (Tentang kami, Hubungi kami, Media & kenyataan, Laporkan data salah) dan *Undang-undang*. Alat pelajar yang perlu log masuk tidak dipaparkan di footer; ia dicapai melalui butang Log masuk di navbar dan sidebar portal. Pautan ke halaman semasa dibuang pada setiap halaman.
- **Onboarding selepas daftar (21 Okt 2026):** "Mulakan dari situasi anda" bukan halaman awam — ia langkah 2 daripada 3 selepas Cipta akaun (Cipta akaun ✓ → Situasi anda → Dashboard). Web: header onboarding (logo, penunjuk langkah, "Langkau dahulu" → dashboard), tanpa navbar/footer awam. Mobile: logo + "Langkau", bar kemajuan 3 segmen. Pautannya dibuang daripada footer awam. Frame dinamakan semula "W / Onboarding · …" dan "M / Onboarding · …" dan diletakkan selepas Cipta akaun dalam aliran 2.

## 23. Logik tahap pelajar (21 Okt 2026)

### 23.1 Keputusan peranan
- **Satu peranan Pelajar** dengan atribut **Tahap pendidikan**. Tahap bukan peranan berasingan kerana pelajar yang sama bertukar tahap (T3 → T4 → lepasan SPM → lepasan pra-U/Diploma). Tahap menentukan borang keputusan, label data, modul yang dipaparkan dan sasaran pengajian.
- **Tiada peranan ibu bapa, penjaga atau kaunselor** (dikemas kini 25 Okt 2026). Sistem hanya ada dua peranan: **Pelajar** dan **Admin**.
- Tahap dipilih semasa onboarding (langkah 2 selepas Cipta akaun) dan boleh ditukar dalam Profil.

### 23.2 Lima tahap
| Tahap | Input akademik | Label data | Modul | Sasaran pengajian | Merit & kelayakan |
|---|---|---|---|---|---|
| Tingkatan 1–3 | Pilihan: **gred peperiksaan sekolah** (skala A–F, boleh dikonfigurasi admin) bagi subjek yang diambil; pelajar tambah/buang subjek daripada katalog. Boleh muat naik slip sekolah dengan persetujuan ibu bapa/penjaga. | "Gred sekolah — bukan peperiksaan awam" | Ujian minat, aktiviti bidang, teroka bidang, pemilih aliran T4, roadmap awal. **Merit Lab & Semakan kelayakan disembunyikan**; "Dokumen akademik" menjadi "Prestasi sekolah". | Aliran T4: Sains Tulen, Sains Sosial/Sastera, STEM Teknikal, Kolej Vokasional (TVET) | Tiada merit; gred sekolah tidak ditukar kepada gred SPM — digunakan untuk kekuatan kategori subjek |
| Tingkatan 4–5 | Subjek SPM daripada katalog (wajib disenaraikan dahulu, boleh dibuang; elektif ditambah ikut aliran), gred semasa (ujian/percubaan) + gred sasaran | Semasa (kelabu) / Sasaran (kuning) | Semua modul | Asasi, Matrikulasi, STPM, Diploma, Politeknik, TVET | Simulasi, sentiasa berlabel "berdasarkan sasaran" |
| Lepasan SPM | Keputusan SPM sebenar (manual / slip), pilihan SVM/SKM | "Disahkan oleh anda" / "Dibaca daripada slip" | Semua modul | Asasi, Matrikulasi, STPM, Diploma, Politeknik, KV/ILKA | Sebenar, formula laluan lepasan SPM |
| Lepasan Sijil / SVM / SKM *(baharu, 26 Okt 2026)* | Pilih kelayakan dalam modal: Sijil Politeknik / Kolej Komuniti, SVM atau SKM. Bidang & nama program; PNGK (Sijil, SVM); tahap SKM 1–3; MUET (pilihan); tahun tamat; SPM asas | — | Teroka Diploma (bidang berkaitan dahulu), Kelayakan, Roadmap, Dokumen | Diploma, DKM/DLKM | Sijil MQF Tahap 3 dalam bidang berkaitan, PNGK ≥ 2.00, SPM asas |
| Lepasan pra-U / Diploma / setaraf *(digabung, 26 Okt 2026)* | Pilih kelayakan dalam modal: STPM, Matrikulasi, Asasi, A-Level, Diploma, DVM atau DKM/DLKM. PNGK (kecuali A-Level), MUET, tahun tamat; STPM gred subjek A–F; A-Level A*–E; **Matrikulasi: jurusan** (Sains Modul I/II/III, Kejuruteraan, Perakaunan, Perakaunan Profesional) yang mengisi subjeknya sendiri + gred A–E (pilihan); **Asasi: bidang & nama program** + gred subjek Asasi pilihan daripada senarai subjek Asasi sendiri (Biologi, Kimia, Fizik, Matematik, Bahasa Inggeris, Prinsip Perakaunan, Pengenalan Undang-undang, Pengajian Islam, Bahasa Arab dan lain-lain; subjek lain boleh ditambah; syarat khas ijazah, contoh B Biologi); **keputusan semester** (PNGS setiap semester; Matrikulasi 2 atau 4 semester, Asasi biasanya 2, sesetengah 3; pelajar tambah semester sendiri, maks. 8) dan PNGK kumulatif; bidang yang tiada dalam senarai boleh ditaip sendiri ("Tambah sebagai bidang lain"); tajuk borang menamakan kelayakan (contoh "Kelayakan Matrikulasi"); Diploma/DVM/DKM: bidang & program, tahap DKM 4 / DLKM 5; SPM asas | A-Level/luar negara: "perlu pengesahan kesetaraan"; pindahan kredit: "anggaran" | Teroka Ijazah (bidang berkaitan dahulu untuk diploma), Banding, Kelayakan, Roadmap, Dokumen | Ijazah Sarjana Muda | Ikut laluan: STPM / Matrikulasi-Asasi / Diploma (bidang berkaitan) |

Dokumen akademik hanya memaparkan borang kelayakan yang dipilih (tiada butang kelayakan lain); kelayakan ditukar di Profil. Kajian syarat: syarat am UA (kepujian BM, lulus Sejarah, PNGK 2.00, MUET Band 1–2), lepasan Sijil/SKM Tahap 3 ke Diploma (bidang berkaitan, PNGK 2.00), SVM ke DVM/Diploma, DVM/DKM/DLKM ke Sarjana Muda Teknologi.

### 23.3 Peralihan tahap
- Pelajar boleh tukar tahap sendiri; sistem mencadangkan peralihan pada tarikh yang ditetapkan admin: setiap Januari ("Sudah naik tingkatan?") dan pada tarikh pengumuman SPM/STPM (helaian "Sudah dapat keputusan SPM?").
- T3 → T4 meminta aliran dan subjek elektif. T5 → Lepasan SPM menukar sasaran kepada keputusan sebenar.
- **Peraturan rekod (dikemas kini 26 Okt 2026)**, peringkat: T1–3 → T4–5 → Lepasan SPM → Lepasan Sijil → Lepasan pra-U/Diploma.
  - **Naik peringkat:** semua rekod dikekalkan sebagai sejarah (contoh: sasaran vs sebenar, Sijil → Diploma).
  - **Turun peringkat** (lazimnya tersalah pilih): rekod peringkat lebih tinggi dipadam (T5 → T3 memadam sasaran SPM; Lepasan SPM → T5 memadam SPM sebenar). T1–3 hanya menyimpan tahun mengikut tingkatan (T1: tahun ini; T2: dua tahun; T3: tiga tahun), jadi T2 → T1 memadam gred tahun lepas.
  - **Tukar kelayakan dalam peringkat yang sama** (Asasi → Diploma, SVM → SKM): rekod kelayakan lama dipadam; SPM dikekalkan.
  - Rekod yang akan dipadam disenaraikan dalam modal; pelajar mesti mengesahkan dahulu. Peraturan dikira oleh servis profil (sama untuk web dan mobile).
- Roadmap dan pilihan disimpan dikekalkan; yang tidak relevan ditanda "semak semula".

### 23.4 Privasi bawah 18 tahun
- Tingkatan 1–5 lazimnya bawah 18 tahun: minta persetujuan ibu bapa/penjaga sebelum muat naik dokumen dan pautan akaun. Tiada keputusan peperiksaan awam diminta untuk T1–3; muat naik slip sekolah hanya dengan persetujuan ibu bapa/penjaga. **Perlu disahkan dengan penasihat undang-undang (PDPA 2010).**

### 23.5 Kesan kepada admin
- Syarat kemasukan disimpan ikut **laluan kemasukan**: Lepasan SPM, Lepasan Sijil/SKM/SVM, Lepasan STPM, Lepasan Matrikulasi/Asasi, Lepasan Diploma/DVM/DKM, Setaraf.
- Formula merit berversi ikut laluan. Skala gred diurus: gred sekolah A–F (T1–3), SPM A+–G, STPM A–F, PNGK/CGPA 0–4, A-Level A*–E.
- Admin mengurus senarai aliran & subjek elektif, tarikh pengumuman SPM/STPM, institusi dan bidang berdaftar.

### 23.6 Skrin Figma
- Halaman 00, section **E · Logik tahap pelajar** (jadual matriks + peraturan sokongan).
- Website, section **3.1 · Profil akademik ikut tahap**: Profil T1–3, Dashboard T1–3, Profil T4–5, Profil lepasan pra-U, Profil lepasan Diploma, Modal kemas kini tahap. Lepasan SPM menggunakan W18 sedia ada.
- **Dikemas kini dalam Figma (26 Okt 2026), website:** `W / Onboarding · Mulakan dari situasi anda` memaparkan 5 tahap baharu; `W / Profil akademik · Lepasan pra-U / Diploma (Diploma)` (dahulu Lepasan Diploma); skrin baharu `W / Profil akademik · Lepasan Sijil (Sijil Politeknik)`, `W / Onboarding · Modal pilih kelayakan (Lepasan Sijil)` dan `W / Profil · Modal sahkan padam rekod`; komponen baharu `Pilihan / Radio` (State Default/Selected, sifat teks Label) dalam section Komponen web.
- **Mobile (26 Okt 2026):** `M / Onboarding · Mulakan dari situasi anda` (5 tahap baharu), `M / Kemas kini tahap pendidikan · helaian` ("Sudah tamat Sijil, pra-U atau Diploma"), `M / Profil akademik · Lepasan pra-U / Diploma (Diploma)`, skrin baharu `M / Profil akademik · Lepasan Sijil (Sijil Politeknik)`, `M / Onboarding · Helaian pilih kelayakan (Lepasan Sijil)` dan `M / Profil · Helaian sahkan padam rekod` (menggunakan komponen `Pilihan / Radio`).
- Mobile, section **3.1**: Profil T1–3, T4–5, pra-U, Diploma, helaian kemas kini tahap. Onboarding web & mobile kini memilih 5 tahap, setiap pilihan dipautkan ke skrin tahapnya.

### 23.7 Subjek: tambah, buang dan tangkap data dengan tepat
- **Tiada TP.** Tingkatan 1–3 menggunakan gred peperiksaan sekolah (lalai A–F; skala & julat markah ditetapkan admin kerana boleh berbeza).
- **Senarai subjek tidak tetap.** Setiap tahap bermula dengan subjek lazim (T4–5: wajib SPM disenaraikan dahulu). Pelajar **buang** subjek yang tidak diambil (×) — contoh Pendidikan Islam ↔ Pendidikan Moral, Sains ↔ elektif sains — dan **tambah** melalui `Combobox / Subjek` (carian + pilih berbilang).
- **Subjek dicari daripada katalog admin** supaya padanan tepat. Katalog: kod, nama rasmi, alias (contoh "Add Math" → Matematik Tambahan), kategori, tahap & aliran yang sah, wajib/elektif, skala gred.
- **Subjek tiada dalam katalog** (contoh Tasawwuf): pelajar menambahnya dengan nama sendiri ("+ Tambah sebagai subjek lain"), berlabel *Subjek lain*; tidak digunakan untuk padanan sehingga admin memetakannya. Had 30 subjek (ada calon SPM mengambil 20 subjek).
- **Rekod gred pelajar:** subjek, tahap, jenis gred (sekolah / semasa / sasaran / sebenar), gred, sumber (manual / slip OCR), tarikh, status semakan. Satu rekod setiap subjek setiap jenis gred.
- **Validasi semasa simpan:** gred mesti sah untuk skala (SPM: A+, A, A-, B+, B, C+, C, D, E, G; STPM: A, A-, B+, B, B-, C+, C, C-, D+, D, F); tiada pendua; subjek wajib yang dibuang diberi amaran (bukan sekatan); ringkasan semakan dipaparkan ("8 subjek · semua bergred · BM kredit ✓ · Sejarah lulus ✓").
- **Peraturan Malaysia yang dikira oleh sistem (dikonfigurasi admin, perlu disahkan dengan sumber rasmi):** kredit SPM = C ke atas; lulus = E ke atas; syarat lazim BM kredit & Sejarah lulus; nilai mata STPM 4.00 → 0.00; PNGK/CGPA 0–4; MUET band.

### 23.8 Padanan program menggunakan AI
1. **Peraturan dahulu (deterministik, bukan AI):** semak syarat wajib setiap program — subjek & gred minimum, bilangan kredit, aliran, MUET, PNGK/CGPA, bidang diploma — berdasarkan rekod institusi yang disahkan admin. Hasil: *Layak / Hampir layak / Belum layak*.
2. **Kekuatan subjek:** gred dinormalkan ikut skala dan dikumpul ikut kategori (Sains & Matematik, Bahasa, Kemanusiaan, Teknikal, Perakaunan & perniagaan).
3. **AI menyusun** program yang layak/hampir layak ikut minat (psikometrik), aktiviti bidang yang dicuba & skor pelajar, dan kekuatan subjek.
4. **Terangkan:** setiap cadangan memaparkan "Kenapa dicadangkan", "Perlu perhatian" (contoh gred kurang), sumber & tarikh syarat, dan label *berdasarkan sasaran* bila guna gred sasaran.
- **Had AI:** tidak mencipta syarat atau program; hanya katalog yang disahkan; data tidak lengkap → minta pelajar lengkapkan, bukan meneka. Butang "Laporkan cadangan yang salah" → baris gilir admin.
- T1–3: cadangan ialah **aliran Tingkatan 4 dan bidang**, bukan program universiti. T4–5: program berdasarkan sasaran. Lepasan SPM / pra-U / Diploma: program berdasarkan keputusan sebenar.
- Skrin: `W / Cadangan program · padanan AI` dan `M / Cadangan program · padanan AI`.

### 23.9 Penyelarasan web ↔ mobile
Setiap fungsi tahap pelajar wujud di kedua-dua platform (jadual penuh di halaman 00, section E): onboarding pilih tahap, profil T1–3, dashboard T1–3, profil T4–5, keputusan SPM sebenar (W18 / M13), profil pra-U, profil Diploma, kemas kini tahap (modal / helaian), pemilih subjek (komponen sama), cadangan program AI. Data disimpan dalam akaun yang sama — perubahan di satu platform terus kelihatan di platform lain.

### 23.10 Muat naik dahulu, betulkan yang ditanda sahaja
- **Muat naik ialah cara utama** untuk semua tahap; isi manual ialah alternatif. Banner `Banner / Muat naik dahulu` (web & mobile) di atas setiap borang keputusan.
- Dokumen diterima: slip SPM, keputusan STPM, transkrip Matrikulasi/Asasi/Diploma, slip peperiksaan sekolah. PDF/JPG/PNG, ≤10 MB, berbilang halaman.
- **Aliran:** muat naik (W12/M21) → persetujuan → pemprosesan (W13–W14/M22) → **semak bacaan** (W15/M23) → disahkan (W16/M24).
- **Pengekstrakan:** sistem mengesan jenis dokumen & tahun, membaca nama calon (dipadankan dengan profil), subjek dan gred; nama subjek pada slip dipetakan ke katalog (contoh "PEND. SENI VISUAL" → Pendidikan Seni Visual) dan gred disemak terhadap skala sah.
- **Tahap keyakinan setiap baris:** *Yakin* (✓ hijau, sudah diisi) atau *Perlu semak* (! kuning) dengan sebab — aksara kabur, subjek tidak dikenal pasti, gred di luar skala, nama calon tidak sepadan. Bahagian berkenaan disorot pada pratonton fail. Penapis "Perlu semak" memaparkan baris bertanda sahaja.
- Pelajar boleh ubah gred, buang subjek, tambah subjek yang tidak dibaca. **Tiada data disimpan ke profil sebelum pelajar menanda pengesahan.** Fail asal dipadam selepas pengesahan kecuali pelajar memilih untuk menyimpannya.
- Tiada dokumen / bacaan gagal → "Isi manual sahaja" (W18/M13) dengan jadual subjek yang sama.

### 23.11 Kad cadangan teratas selepas profil dikemas kini
- Komponen `Kad / Cadangan teratas` (web & mobile) dipaparkan **sebaik keputusan disahkan** (W16/M24) dan di **dashboard** (W02/M03).
- Kandungan: label "Baru dikemas kini · berdasarkan keputusan/sasaran", apa yang berubah ("+3 program kini layak"), **padanan terkuat** (★, status kelayakan, 3 sebab, Lihat syarat / Simpan), 2 pilihan kuat lain, dan "Lihat semua cadangan" → Cadangan program · padanan AI.
- Kad dikira semula setiap kali profil akademik, keputusan ujian minat atau aktiviti berubah.
- **Skrin utama mobile (M03) memakai varian ringkas** (`Saiz=Mobile ringkas`: padanan terkuat + "Lihat 12 cadangan & sebab →") supaya muat satu skrin; senarai penuh dan sebab berada di halaman Cadangan program. Jubin pintasan dibuang daripada M03 kerana sudah ada dalam butang tengah Semua alat. Versi penuh kad kekal di M24 (keputusan disahkan) dan dashboard web.

### 23.12 Navigasi mobile (dikemas kini 21 Okt 2026)
- Tab bawah: **Utama · Teroka · [Semua alat] · Roadmap · Merit Lab**. "Semua alat" ialah bulatan besar di tengah (terangkat) yang membuka helaian Semua alat; varian Aktif=Semua alat menyerlahkannya kuning.
- **Profil dipindahkan ke bar atas** sebagai avatar (menggantikan ikon grid) → Profil & perjalanan saya. Bar atas: Carian · Kemas kini · Avatar.
- Web kekal dengan sidebar (profil di bawah sidebar) — fungsi yang sama, susun atur ikut peranti.

### 23.13 Ikon pada butang (21 Okt 2026)
- Pustaka **Ikon tindakan v2** (halaman 00, section B): 22 ikon garis 2px, 24px — panah-kanan, muat-naik, muat-turun, tambah, pensel, pangkah, jam, akaun-baru, log-masuk, semak, penanda, lajur, kalkulator, laluan, kilauan, kompas, cari, mesej, bantuan, dokumen, mula, ulang.
- Semua butang teks di web (152) dan mobile (112) kini berikon, dipadankan ikut maksud: muat naik → muat-naik; simpan → penanda; simpan & … / sahkan / semak → semak; banding → lajur; Merit/anggar → kalkulator; roadmap/laluan → laluan; tanya AI / ujian minat → kilauan; isi manual / ubah → pensel; kosongkan → pangkah; log masuk → log-masuk; cipta akaun → akaun-baru; hubungi/laporkan/hantar → mesej; cari/tapis → cari; teroka → kompas. Butang navigasi (Lihat, Teruskan, Buka, Kembali) → **anak panah di hujung**; ikon lain di depan teks.
- Warna ikon mengikut warna teks butang; saiz 20/18/16px ikut saiz teks. Butang baharu perlu ikut peraturan yang sama.

### 23.14 Akses ke Cadangan program
- Sidebar web: item **Cadangan saya** (ikon kilauan, lencana "Baru") di atas Teroka program; aktif pada halaman Cadangan program.
- Direktori program (Teroka program): jalur kuning "12 program sepadan dengan profil anda → Lihat cadangan".
- Mobile: pintasan "Cadangan saya · 12 program" di atas helaian Semua alat; jalur yang sama pada M07 Teroka; kad ringkas di M03.

## 24. Peranan dipermudah, ramalan, interaksi & dokumentasi kejuruteraan (25 Okt 2026)

- **Dua peranan sahaja: Pelajar dan Admin.** Akaun ibu bapa, penjaga dan kaunselor dibuang daripada reka bentuk, ERD dan rajah penguraian. Pelajar bawah 18 tahun menanda pengesahan kebenaran ibu bapa/penjaga sebelum muat naik dokumen (kotak semak, bukan peranan).
- **Admin satu peranan, semakan dua orang dikekalkan:** admin yang menyediakan draf tidak boleh meluluskan draf sendiri — kelulusan oleh admin lain. Istilah "Editor" → "penyedia draf", "Penyemak" → "admin lain / admin pengesah" pada semua skrin admin (A0–A14, F1–F9). A12 kini menunjukkan semua staf sebagai Admin dan matriks akses Admin vs Pelajar.
- **Landing:** tab "Ibu bapa & kaunselor" ditukar kepada "Pra-U & Diploma"; teks hero dan Cipta akaun tidak lagi menyebut ibu bapa/kaunselor. Pilihan "Ibu bapa / penjaga / kaunselor" dibuang daripada onboarding web & mobile.
- **Ramalan peluang tawaran:** setiap kad cadangan (web & mobile) kini memaparkan "Peluang tawaran" (Tinggi / Sederhana / Rendah / Tiada data) dengan meter, jarak merit berbanding purata tawaran terendah dan tahun data. Kad "Cadangan teratas" ada cip "Peluang tinggi". Panel "Bagaimana padanan dibuat" menerangkan ambang band.
- **Interaksi:** semua butang web (164) dan mobile (278) kini dipautkan; 19 butang terakhir dipautkan pada 25 Okt. Helaian **Keadaan interaksi** (halaman 00, section B): Butang (Utama/Kedua × Biasa, Hover, Tekan, Dinyahaktif, Memuatkan), Medan (Biasa, Fokus, Terisi, Ralat, Dinyahaktif), Kad (Biasa, Hover, Dipilih), Toast (Berjaya, Ralat, Info) — boleh dicuba dalam prototaip — serta 10 peraturan interaksi (masa animasi, sasaran sentuh 44 px, fokus, memuatkan, kosong, ralat, tindakan berisiko, borang).
- **Dokumentasi kejuruteraan (Bahasa Inggeris)** dalam `docs/`: `system-design.md` (seni bina, 10 modul, aliran data, API, keselamatan, ujian), `ai-and-cost-plan.md` (cadangan, ramalan, pengambilan kandungan, pilihan model & kos RM0), `roadmap.md` (Now/Next/Later, 14 sprint, MoSCoW, risiko). ERD (27 jadual) dan rajah penguraian (10 modul × 5 fungsi) dijana daripada `tools/diagrams/`.

### 24.1 Chat tanpa kuota (26 Okt 2026)
- "Tanya AI" percuma digunakan dan **tiada kuota harian yang kelihatan kepada pelajar** — keputusan ini menggantikan cadangan kuota AI per pengguna dalam seksyen 18 dan baki kuota pada sidebar (seksyen 22).
- Perlindungan senyap kekal untuk melindungi had percuma pembekal yang dikongsi: cache jawapan, FAQ dahulu, jeda pendek jika satu akaun menghantar terlalu banyak soalan dalam seminit, dan beralih ke model tempatan atau mesej "AI sedang sibuk" jika had pembekal tercapai.
- Kuota/had untuk muat naik dokumen (OCR) dan bajet API berbayar kekal sebagai kawalan kos di server.

### 24.2 Laluan alternatif untuk pelajar yang belum layak (26 Okt 2026)
- Didokumenkan dalam `docs/` (system-design §3.3–3.4 dan §4.3, ai-and-cost-plan §3, roadmap, panduan §4). ERD menambah `PROGRAM_PATHWAY` (28 jadual); rajah penguraian 4.5 "Suggest alternative pathways".
- Apabila kurang daripada 5 program layak pada peringkat sasaran: *Mohon sekarang* (Sijil/SKM), *Laluan bertangga*, *Tingkatkan keputusan* (simulasi "bagaimana jika"), *Hampir layak*. Tidak menggalakkan permohonan yang jelas tidak memenuhi syarat minimum; laluan rasmi seperti temu duga/APEL dilabel "Boleh cuba — tertakluk kelulusan institusi".
- **Belum dibina dalam Figma**: skrin "Laluan alternatif" (web & mobile).
- Panduan mudah dibaca: `docs/edulaunch-guide.md`.

### 24.3 Ruang admin mesra pengguna bukan IT (26 Okt 2026)
- **Sebab:** kebanyakan admin bukan orang IT. Ruang admin perlu mengajar dirinya sendiri tanpa manual.
- **Perubahan global (komponen, kesan pada semua skrin A0–A14, F1–F9):**
  - Cip status guna bahasa harian: Konflik → **Sumber bercanggah**, Lapuk → **Perlu semak semula**, Tidak tersedia → **Tiada sumber**.
  - Sidebar disusun ikut tugas: Kerja hari ini · Maklumat program · Sumber maklumat · Kandungan pelajar · Akaun & sokongan. "Ringkasan" → **Laman utama**.
  - Item baharu **Laluan bertangga**.
  - Suis **Mod latihan** di bawah sidebar.
- **Skrin baharu (halaman 00, section C, baris "7 · Belajar tanpa manual"):**
  - **B1 Laman utama · pilih tugas:** "Apa yang anda mahu buat hari ini?" dengan 3 tugas utama, senarai tugas lain, senarai semak "Belajar sambil buat" dan kotak bantuan (cari soalan, soalan lazim, video 90 saat).
  - **B2 Wizard kemas kini syarat:** 4 langkah, simpan automatik, dan pembina ayat ("Pelajar perlu minimum [B] dalam [Matematik]", "SALAH SATU daripada") menggantikan DAN/ATAU. Juga ada tampal ayat prospektus, ayat sumber, dan ujian dengan calon contoh.
  - **B3 Semak draf · bantuan di tempat:** perbandingan sebelum/selepas, pilihan sumber dengan cadangan, kesan kepada pelajar, panel "Bantuan skrin ini" (langkah, istilah, "Tunjukkan saya") dan tooltip istilah.
  - **B4 Mod latihan:** data contoh dan 6 misi berpandu (2–4 minit setiap satu), dengan kemajuan dan butang set semula.
  - **B5 Keadaan mesra:** buat asal dan simpan automatik, ralat yang memberitahu cara membetulkan, pengesahan dengan kesan dalam angka, skrin kosong yang memberi arah, tooltip istilah, jadual istilah lama → baharu, dan **10 prinsip ruang admin**.
  - **B6 Tambah laluan bertangga:** rantai visual Sijil → Diploma dengan syarat PNGK, borang pilih-bukan-taip, sumber wajib, dan pratonton apa yang pelajar nampak.
- **Prototaip:** butang B1, B2, B4 dan B6 serta item sidebar (Laman utama, Laluan bertangga, Mod latihan) dipautkan antara skrin baharu.
- Dokumentasi: `docs/system-design.md` §3.10.

### 24.4 Roadmap ikut tahap: aliran Tingkatan 4 & kerjaya lepasan Diploma (26 Okt 2026)
- **Tingkatan 1–3:**
  - Roadmap dibuka dengan "Aliran mana sesuai untuk anda?". Aliran disusun ikut skor = minat 50% + kekuatan subjek teras sekolah 40% + aktiviti yang disukai 10%, dengan 2 sebab bagi setiap aliran.
  - Ada paparan "Kalau saya pilih aliran lain?" (bidang yang terbuka / lebih sukar) dan laluan T3 → aliran T4–5 → sasaran SPM → selepas SPM → kerjaya.
  - Dilabel sebagai panduan sahaja; keputusan mengikut sekolah.
- **Lepasan Diploma:**
  - Roadmap "Kerja dahulu atau sambung belajar?" dengan pilihan A Terus bekerja, B Sambung Ijazah, C Kerja dahulu kemudian sambung.
  - Senarai "Boleh bekerja sekarang (Diploma diterima)" dan "Dibuka dengan Ijazah" (bersama Ijazah yang pelajar layak).
  - Gaji tidak dipaparkan tanpa sumber rasmi; bukan jaminan pekerjaan.
- **Figma:**
  - Web: `W / Roadmap · Tingkatan 1–3 · pilih aliran` dan `W / Roadmap · Lepasan Diploma · kerja atau sambung` (section 7 · Roadmap).
  - Mobile ringkas: `M / Roadmap · Tingkatan 1–3 · pilih aliran` dan `M / Roadmap · Lepasan Diploma · kerja atau sambung`.
  - Butang "Bandingkan aliran" pada dashboard Tingkatan 1–3 dipautkan ke roadmap aliran.
- **ERD (32 jadual):**
  - Jadual baharu `STREAM`, `STREAM_FIELD`, `CAREER`, `FIELD_CAREER`.
  - `STUDENT.stream_id` (FK); `ROADMAP_STEP` merujuk `stream_id`/`career_id`.
  - Modul 07 dinamakan semula "Study & Career Planning".
- Dokumentasi: system-design §3.7, ai-and-cost-plan §1, panduan senario 1 & 5, roadmap.

- **ERD diringkaskan kepada 24 jadual (26 Okt 2026):** aliran T4 disimpan sebagai `PROGRAM` (`study_level = form4_stream`), jadi `STREAM`/`STREAM_FIELD` tidak diperlukan. `QUESTION` + `ASSESSMENT_ANSWER` digabung ke dalam `ASSESSMENT.answers`. `FIELD_CAREER` diganti dengan `CAREER.field_id`. Jadual teknikal (`AI_CHAT`, `CONTENT_CHUNK`, `NOTIFICATION`, log audit) masih wujud dalam sistem tetapi tidak ditunjukkan dalam ERD dokumentasi.

## 25. Ruang admin dibina dalam kod (Step 8, 27 Okt 2026)

Skrin yang dibina mengikut Admin v2:
- **B1 Laman utama** menunjukkan tiga tugas (semak draf yang menunggu, kemas kini syarat program, tambah program baharu), "Kerja anda" (dipulangkan, draf, menunggu admin lain), ringkasan katalog dan "Cara ruang admin berfungsi".
- **A1 Peti tugasan** ada tab Untuk saya / Dipulangkan / Draf saya / Menunggu admin lain, dengan yang paling lama menunggu di atas.
- **A5 Universiti & program** ada carian, penapis status dan jadual dengan laluan yang sudah ada syarat diterbitkan. Halaman program mengandungi maklumat program, butang semakan, dan syarat ikut laluan masuk.
- **B2 Wizard syarat** dalam satu halaman: penunjuk 4 langkah, pautan sumber rasmi, dan syarat sebagai ayat ("Pelajar perlu minimum [B] dalam [Matematik]", "SALAH SATU daripada", "atau pilihan lain"). Setiap baris ada ayat sumber, panel "Apa pelajar nampak", dan butang Simpan draf / Hantar untuk semakan / Buang draf.
- **B3 Semak draf**: "1. Apa yang berubah?" (versi diterbitkan bersebelahan draf, baris Baharu/Dibuang ditanda), "2. Semak sumber" (pautan dan ayat sumber), "3. Keputusan anda" (kesan kepada pelajar, Luluskan & terbitkan, Pulangkan dengan soalan).
- **Institusi**: senarai dengan tambah dan sunting di tempat. Institusi ialah data rujukan, jadi tiada semakan dua admin.

Susunan aliran (dikemas kini 27 Okt 2026): sidebar **Kerja hari ini** (Laman utama, Peti tugasan) dan **Katalog** (Institusi, kemudian Program), ikut hierarki data institusi → program → syarat. Setiap institusi ada halaman sendiri (sumber rasmi, program, "Tambah program di sini"). Senarai program boleh ditapis ikut institusi, status dan "belum ada syarat diterbitkan". Butang Padam hanya muncul untuk institusi tanpa program. Figma Admin v2 masih menunjukkan "Universiti & program"; perlu diselaraskan.

Peraturan:
- Program baharu juga mengikut peraturan dua admin. Program diterbitkan boleh dibetulkan terus (nama, tempoh, bidang) atau diarkibkan.
- Laluan masuk baharu ialah SVM, SKM, DVM dan DKM/DLKM.

Belum dibina (langkah kemudian): mod latihan, lawatan berpandu, carian bantuan, jejak audit, formula merit, laluan bertangga, sumber & import, dan pemetaan subjek/bidang yang ditaip sendiri oleh pelajar. Item sidebar bagi modul ini tidak dipaparkan sehingga ia berfungsi.

### 25.1 Profil institusi dan borang program standard (27 Okt 2026)
- **Profil institusi** dengan empat tab: Ringkasan (bilangan yang membuka senarai sepadan, dan satu "Langkah seterusnya"), Program, Sumber & import (laman web, halaman program, prospektus/PDF, ePanduan, lain-lain), Tetapan (sunting dan Zon bahaya). Institusi baharu terus membuka profilnya. Profil ini menjadi tempat "Program dijumpai" daripada import nanti; butang import tidak dipaparkan selagi belum berfungsi.
- **Padam institusi:** modal menyenaraikan semua yang turut dipadam, dan butang hanya aktif selepas admin menaip singkatan institusi. Tanpa program diterbitkan, terus dipadam (semua data di bawahnya dipadam bersama dalam satu transaksi). Jika pelajar sedang nampak programnya, permintaan masuk ke Peti tugasan dan admin lain meluluskan atau membatalkan.
- **Borang program mengikut standard ePanduan JPT dan prospektus universiti:** Identiti (nama, kod program JPT/UPU, kod universiti, fakulti), Akademik (bidang NEC 157 kod, tempoh, mod pengajian, kampus, bidang cadangan diisi sendiri daripada kod NEC), Kemasukan (temu duga/ujian, Bumiputera sahaja, STEM, TVET), Sumber (pautan).
- Figma Admin v2 perlu diselaraskan dengan skrin ini.

### 25.2 Aliran program disusun semula (27 Okt 2026)
- Kajian: CMS seperti Contentful (status "Changed": versi diterbitkan kekal sehingga perubahan diterbitkan) dan prinsip maker-checker / four eyes (pembuat dan pelulus orang berbeza).
- **Halaman program kini mod Lihat**: panel status dengan tiga langkah (Draf → Semakan admin lain → Diterbitkan, atau Perubahan → Semakan → Digunakan), satu ayat apa seterusnya, dan tindakan utama dahulu. Tab Maklumat (baca sahaja, ikut kumpulan borang) dan Syarat kemasukan.
- **Mod Sunting di halaman sendiri** (`/sunting`) dengan Batal. Mana-mana admin boleh menyunting draf dan menjadi penyedianya; pelulus mesti admin lain. Draf dalam semakan boleh ditarik balik.
- **Program diterbitkan disunting sebagai "perubahan"**: pelajar terus nampak versi semasa; jadual Sekarang / Cadangan untuk penyemak; Buang perubahan.
- **Borang**: medan wajib bertanda *, kod program dan pautan disemak apabila keluar dari medan, tempoh menunjukkan ± tahun, medan tidak berkaitan disembunyikan untuk aliran Tingkatan 4, institusi dan peringkat boleh ditukar sebelum diterbitkan.
- **Syarat kemasukan**: satu kawalan "Tambah syarat untuk laluan" (laluan biasa untuk peringkat itu di atas) menggantikan banyak butang kuning.
- Arkibkan dan Buang perubahan meminta pengesahan dahulu.

### 25.3 Ikon, interaksi, susunan dan halaman (27 Okt 2026)
- Panduan dari skill ui-ux-pro-max: satu keluarga ikon garis (geometri Lucide, ISC) dalam `components/admin/icons.tsx`; ikon di sebelah teks disembunyikan daripada pembaca skrin; status tidak bergantung pada warna sahaja.
- **Butang**: satu gaya (`buttonClass`) untuk utama, aksen, sekunder, bahaya dan hantu, dengan hover, cincin fokus papan kekunci, tekan kecil dan spinner semasa menghantar. Gerakan dimatikan untuk pengguna yang memilih kurang gerakan.
- **Tab dengan ikon dan bilangan** pada profil institusi, halaman program dan peti tugasan; kad statistik dengan ikon dan anak panah; keadaan kosong dengan ikon dan ayat.
- **Jadual program**: kepala lajur boleh disusun (`aria-sort`), lajur baharu Dikemas kini, 20 baris setiap halaman dengan pautan halaman. Susunan dan halaman disimpan dalam alamat (`?susun=&arah=&halaman=`).
- **Senarai institusi**: carian, susun ikut Nama / Bilangan program / Negeri, 15 setiap halaman.
- Figma belum dikemas kini untuk skrin ini.
