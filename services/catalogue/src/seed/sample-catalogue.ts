import type { SeedDataset } from './seed-types.js';

/**
 * SAMPLE DATA for development and demos. Institutions, programmes and requirements are made up
 * (every institution is called "Contoh") and must not be shown as real entry requirements.
 * Real data is entered later by admins from official sources.
 */
const Q = (text: string) => `[Contoh] ${text}`;

export const sampleCatalogue: SeedDataset = {
  institutions: [
    { key: 'uca', name: 'Universiti Contoh A', shortName: 'UCA', type: 'public_university', websiteUrl: null },
    { key: 'pcb', name: 'Politeknik Contoh B', shortName: 'PCB', type: 'polytechnic', websiteUrl: null },
    { key: 'kcc', name: 'Kolej Komuniti Contoh C', shortName: 'KCC', type: 'community_college', websiteUrl: null },
  ],

  fields: [
    { key: 'computing', name: 'Computing & IT', riasec: { R: 3, I: 5, A: 2, S: 1, E: 2, C: 4 } },
    { key: 'engineering', name: 'Engineering', riasec: { R: 5, I: 4, A: 1, S: 1, E: 2, C: 3 } },
    { key: 'health', name: 'Health & Medicine', riasec: { R: 2, I: 5, A: 1, S: 5, E: 1, C: 2 } },
    { key: 'pure-science', name: 'Pure Science', riasec: { R: 2, I: 5, A: 1, S: 1, E: 1, C: 3 } },
    { key: 'business', name: 'Business & Accounting', riasec: { R: 1, I: 2, A: 1, S: 2, E: 4, C: 5 } },
    { key: 'education', name: 'Education', riasec: { R: 1, I: 2, A: 3, S: 5, E: 2, C: 2 } },
    { key: 'design', name: 'Art & Design', riasec: { R: 2, I: 2, A: 5, S: 2, E: 2, C: 1 } },
    { key: 'social', name: 'Law & Social Science', riasec: { R: 1, I: 3, A: 2, S: 4, E: 4, C: 3 } },
    { key: 'technical', name: 'Technical & Vocational', riasec: { R: 5, I: 2, A: 2, S: 1, E: 2, C: 2 } },
  ],

  subjects: [
    // SPM
    { key: 'spm-bm', name: 'Bahasa Melayu', qualification: 'spm', category: 'core', isMandatory: true },
    { key: 'spm-bi', name: 'Bahasa Inggeris', qualification: 'spm', category: 'core', isMandatory: true },
    { key: 'spm-math', name: 'Matematik', qualification: 'spm', category: 'core', isMandatory: true },
    { key: 'spm-history', name: 'Sejarah', qualification: 'spm', category: 'core', isMandatory: true },
    { key: 'spm-islam', name: 'Pendidikan Islam', qualification: 'spm', category: 'core', isMandatory: false },
    { key: 'spm-moral', name: 'Pendidikan Moral', qualification: 'spm', category: 'core', isMandatory: false },
    { key: 'spm-science', name: 'Sains', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-addmath', name: 'Matematik Tambahan', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-physics', name: 'Fizik', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-chemistry', name: 'Kimia', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-biology', name: 'Biologi', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-accounting', name: 'Prinsip Perakaunan', qualification: 'spm', category: 'business', isMandatory: false },
    { key: 'spm-economics', name: 'Ekonomi', qualification: 'spm', category: 'business', isMandatory: false },
    { key: 'spm-art', name: 'Pendidikan Seni Visual', qualification: 'spm', category: 'arts', isMandatory: false },
    // Form 1–3 school exams (school grade scale, never converted to SPM)
    { key: 'sch-bm', name: 'Bahasa Melayu (sekolah)', qualification: 'school', category: 'core', isMandatory: true },
    { key: 'sch-bi', name: 'Bahasa Inggeris (sekolah)', qualification: 'school', category: 'core', isMandatory: true },
    { key: 'sch-math', name: 'Matematik (sekolah)', qualification: 'school', category: 'core', isMandatory: true },
    { key: 'sch-science', name: 'Sains (sekolah)', qualification: 'school', category: 'science', isMandatory: true },
    { key: 'sch-history', name: 'Sejarah (sekolah)', qualification: 'school', category: 'core', isMandatory: true },
    { key: 'sch-rbt', name: 'Reka Bentuk dan Teknologi (sekolah)', qualification: 'school', category: 'technical', isMandatory: false },
  ],

  programmes: [
    // Form 4 streams: no institution
    { key: 'stream-pure-science', name: 'Aliran Sains Tulen', institutionKey: null, studyLevel: 'form4_stream', durationSemesters: null, fieldKeys: ['pure-science', 'health', 'engineering', 'computing'] },
    { key: 'stream-stem-technical', name: 'Aliran STEM Teknikal', institutionKey: null, studyLevel: 'form4_stream', durationSemesters: null, fieldKeys: ['engineering', 'technical'] },
    { key: 'stream-arts', name: 'Aliran Sains Sosial / Sastera', institutionKey: null, studyLevel: 'form4_stream', durationSemesters: null, fieldKeys: ['social', 'business', 'education'] },
    { key: 'stream-vocational', name: 'Aliran Kolej Vokasional', institutionKey: null, studyLevel: 'form4_stream', durationSemesters: null, fieldKeys: ['technical', 'design'] },
    // After SPM
    { key: 'asasi-sains', name: 'Asasi Sains', institutionKey: 'uca', studyLevel: 'foundation', durationSemesters: 2, fieldKeys: ['pure-science', 'health'] },
    { key: 'dip-cs', name: 'Diploma Sains Komputer', institutionKey: 'pcb', studyLevel: 'diploma', durationSemesters: 6, fieldKeys: ['computing'] },
    { key: 'dip-ee', name: 'Diploma Kejuruteraan Elektrik', institutionKey: 'pcb', studyLevel: 'diploma', durationSemesters: 6, fieldKeys: ['engineering'] },
    { key: 'dip-accounting', name: 'Diploma Perakaunan', institutionKey: 'pcb', studyLevel: 'diploma', durationSemesters: 6, fieldKeys: ['business'] },
    { key: 'dip-multimedia', name: 'Diploma Multimedia Kreatif', institutionKey: 'pcb', studyLevel: 'diploma', durationSemesters: 6, fieldKeys: ['design', 'computing'] },
    { key: 'cert-it', name: 'Sijil Teknologi Maklumat', institutionKey: 'kcc', studyLevel: 'certificate', durationSemesters: 4, fieldKeys: ['computing'] },
    { key: 'cert-graphic', name: 'Sijil Reka Bentuk Grafik', institutionKey: 'kcc', studyLevel: 'certificate', durationSemesters: 4, fieldKeys: ['design'] },
    // After Diploma or pre-university
    { key: 'deg-cs', name: 'Ijazah Sarjana Muda Sains Komputer', institutionKey: 'uca', studyLevel: 'degree', durationSemesters: 8, fieldKeys: ['computing'] },
    { key: 'deg-se', name: 'Ijazah Sarjana Muda Kejuruteraan Perisian', institutionKey: 'uca', studyLevel: 'degree', durationSemesters: 8, fieldKeys: ['computing', 'engineering'] },
    { key: 'deg-accounting', name: 'Ijazah Sarjana Muda Perakaunan', institutionKey: 'uca', studyLevel: 'degree', durationSemesters: 8, fieldKeys: ['business'] },
  ],

  requirements: [
    // Streams: school grades (A–F)
    {
      programmeKey: 'stream-pure-science',
      entryRoute: 'form3',
      rules: [
        { groupNo: 1, ruleType: 'key_subject', subjectKey: 'sch-science', minGrade: 'B', evidenceQuote: Q('Pelajar digalakkan memperoleh sekurang-kurangnya B dalam Sains.') },
        { groupNo: 2, ruleType: 'key_subject', subjectKey: 'sch-math', minGrade: 'B', evidenceQuote: Q('Pelajar digalakkan memperoleh sekurang-kurangnya B dalam Matematik.') },
      ],
    },
    {
      programmeKey: 'stream-stem-technical',
      entryRoute: 'form3',
      rules: [
        { groupNo: 1, ruleType: 'key_subject', subjectKey: 'sch-math', minGrade: 'C', evidenceQuote: Q('Sekurang-kurangnya C dalam Matematik.') },
        { groupNo: 2, ruleType: 'key_subject', subjectKey: 'sch-rbt', minGrade: 'C', evidenceQuote: Q('Sekurang-kurangnya C dalam Reka Bentuk dan Teknologi.') },
      ],
    },
    {
      programmeKey: 'stream-arts',
      entryRoute: 'form3',
      rules: [{ groupNo: 1, ruleType: 'key_subject', subjectKey: 'sch-bm', minGrade: 'C', evidenceQuote: Q('Sekurang-kurangnya C dalam Bahasa Melayu.') }],
    },
    {
      programmeKey: 'stream-vocational',
      entryRoute: 'form3',
      rules: [{ groupNo: 1, ruleType: 'key_subject', subjectKey: 'sch-bm', minGrade: 'D', evidenceQuote: Q('Lulus Bahasa Melayu.') }],
    },
    // After SPM
    {
      programmeKey: 'asasi-sains',
      entryRoute: 'spm',
      rules: [
        { groupNo: 1, ruleType: 'min_grade', subjectKey: 'spm-bm', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Bahasa Melayu.') },
        { groupNo: 2, ruleType: 'min_grade', subjectKey: 'spm-math', minGrade: 'B', evidenceQuote: Q('Sekurang-kurangnya B dalam Matematik.') },
        { groupNo: 3, ruleType: 'min_grade', subjectKey: 'spm-chemistry', minGrade: 'B', evidenceQuote: Q('Sekurang-kurangnya B dalam Kimia.') },
        { groupNo: 4, ruleType: 'min_grade', subjectKey: 'spm-physics', minGrade: 'B', evidenceQuote: Q('B dalam Fizik atau Biologi.') },
        { groupNo: 4, ruleType: 'min_grade', subjectKey: 'spm-biology', minGrade: 'B', evidenceQuote: Q('B dalam Fizik atau Biologi.') },
        { groupNo: 5, ruleType: 'min_credits', minGrade: 'C', minValue: 5, evidenceQuote: Q('Kepujian dalam sekurang-kurangnya lima mata pelajaran.') },
      ],
    },
    {
      programmeKey: 'dip-cs',
      entryRoute: 'spm',
      rules: [
        { groupNo: 1, ruleType: 'min_grade', subjectKey: 'spm-bm', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Bahasa Melayu.') },
        { groupNo: 2, ruleType: 'min_grade', subjectKey: 'spm-math', minGrade: 'B', evidenceQuote: Q('Sekurang-kurangnya gred B dalam Matematik.') },
        { groupNo: 3, ruleType: 'min_grade', subjectKey: 'spm-physics', minGrade: 'C', evidenceQuote: Q('Kepujian dalam salah satu: Fizik, Sains atau Matematik Tambahan.') },
        { groupNo: 3, ruleType: 'min_grade', subjectKey: 'spm-science', minGrade: 'C', evidenceQuote: Q('Kepujian dalam salah satu: Fizik, Sains atau Matematik Tambahan.') },
        { groupNo: 3, ruleType: 'min_grade', subjectKey: 'spm-addmath', minGrade: 'C', evidenceQuote: Q('Kepujian dalam salah satu: Fizik, Sains atau Matematik Tambahan.') },
        { groupNo: 4, ruleType: 'min_grade', subjectKey: 'spm-bi', minGrade: 'E', evidenceQuote: Q('Lulus Bahasa Inggeris.') },
      ],
    },
    {
      programmeKey: 'dip-ee',
      entryRoute: 'spm',
      rules: [
        { groupNo: 1, ruleType: 'min_grade', subjectKey: 'spm-bm', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Bahasa Melayu.') },
        { groupNo: 2, ruleType: 'min_grade', subjectKey: 'spm-math', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Matematik.') },
        { groupNo: 3, ruleType: 'min_grade', subjectKey: 'spm-physics', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Fizik atau Sains.') },
        { groupNo: 3, ruleType: 'min_grade', subjectKey: 'spm-science', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Fizik atau Sains.') },
      ],
    },
    {
      programmeKey: 'dip-accounting',
      entryRoute: 'spm',
      rules: [
        { groupNo: 1, ruleType: 'min_grade', subjectKey: 'spm-bm', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Bahasa Melayu.') },
        { groupNo: 2, ruleType: 'min_grade', subjectKey: 'spm-math', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Matematik.') },
        { groupNo: 3, ruleType: 'min_credits', minGrade: 'C', minValue: 3, evidenceQuote: Q('Kepujian dalam sekurang-kurangnya tiga mata pelajaran.') },
      ],
    },
    {
      programmeKey: 'dip-multimedia',
      entryRoute: 'spm',
      rules: [
        { groupNo: 1, ruleType: 'min_grade', subjectKey: 'spm-bm', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Bahasa Melayu.') },
        { groupNo: 2, ruleType: 'min_grade', subjectKey: 'spm-math', minGrade: 'C', evidenceQuote: Q('Kepujian dalam Matematik.') },
        { groupNo: 3, ruleType: 'min_credits', minGrade: 'C', minValue: 3, evidenceQuote: Q('Kepujian dalam sekurang-kurangnya tiga mata pelajaran.') },
      ],
    },
    {
      programmeKey: 'cert-it',
      entryRoute: 'spm',
      rules: [
        { groupNo: 1, ruleType: 'min_grade', subjectKey: 'spm-bm', minGrade: 'E', evidenceQuote: Q('Lulus Bahasa Melayu.') },
        { groupNo: 2, ruleType: 'min_grade', subjectKey: 'spm-math', minGrade: 'E', evidenceQuote: Q('Lulus Matematik.') },
      ],
    },
    {
      programmeKey: 'cert-graphic',
      entryRoute: 'spm',
      rules: [{ groupNo: 1, ruleType: 'min_grade', subjectKey: 'spm-bm', minGrade: 'E', evidenceQuote: Q('Lulus Bahasa Melayu.') }],
    },
    // After Diploma
    {
      programmeKey: 'deg-cs',
      entryRoute: 'diploma',
      rules: [
        { groupNo: 1, ruleType: 'min_cgpa', minValue: 3, evidenceQuote: Q('Diploma berkaitan dengan PNGK sekurang-kurangnya 3.00.') },
        { groupNo: 2, ruleType: 'min_muet', minValue: 3, evidenceQuote: Q('MUET sekurang-kurangnya Band 3.') },
      ],
    },
    {
      programmeKey: 'deg-se',
      entryRoute: 'diploma',
      rules: [
        { groupNo: 1, ruleType: 'min_cgpa', minValue: 2.75, evidenceQuote: Q('Diploma berkaitan dengan PNGK sekurang-kurangnya 2.75.') },
        { groupNo: 2, ruleType: 'min_muet', minValue: 3, evidenceQuote: Q('MUET sekurang-kurangnya Band 3.') },
      ],
    },
    {
      programmeKey: 'deg-accounting',
      entryRoute: 'diploma',
      rules: [
        { groupNo: 1, ruleType: 'min_cgpa', minValue: 3, evidenceQuote: Q('Diploma Perakaunan dengan PNGK sekurang-kurangnya 3.00.') },
        { groupNo: 2, ruleType: 'min_muet', minValue: 3.5, evidenceQuote: Q('MUET sekurang-kurangnya Band 3.5.') },
      ],
    },
  ],

  pathways: [
    { fromKey: 'cert-it', toKey: 'dip-cs', conditionText: 'Lulus Sijil Teknologi Maklumat dengan PNGK 2.50', minCgpa: 2.5 },
    { fromKey: 'cert-graphic', toKey: 'dip-multimedia', conditionText: 'Lulus Sijil Reka Bentuk Grafik dengan PNGK 2.50', minCgpa: 2.5 },
    { fromKey: 'dip-cs', toKey: 'deg-cs', conditionText: 'Diploma Sains Komputer dengan PNGK 3.00', minCgpa: 3 },
    { fromKey: 'dip-cs', toKey: 'deg-se', conditionText: 'Diploma Sains Komputer dengan PNGK 2.75', minCgpa: 2.75 },
    { fromKey: 'dip-accounting', toKey: 'deg-accounting', conditionText: 'Diploma Perakaunan dengan PNGK 3.00', minCgpa: 3 },
  ],

  careers: [
    { key: 'it-support', fieldKey: 'computing', title: 'Juruteknik Sokongan IT', description: 'Menyelenggara komputer, rangkaian dan membantu pengguna.', minStudyLevel: 'diploma' },
    { key: 'web-dev', fieldKey: 'computing', title: 'Pembangun Web (Junior)', description: 'Membina dan menyelenggara laman web.', minStudyLevel: 'diploma' },
    { key: 'software-engineer', fieldKey: 'computing', title: 'Jurutera Perisian', description: 'Mereka bentuk dan membina sistem perisian.', minStudyLevel: 'degree' },
    { key: 'data-scientist', fieldKey: 'computing', title: 'Saintis Data', description: 'Menganalisis data untuk membantu keputusan.', minStudyLevel: 'degree' },
    { key: 'electrical-tech', fieldKey: 'engineering', title: 'Juruteknik Elektrik', description: 'Memasang dan membaiki sistem elektrik.', minStudyLevel: 'diploma' },
    { key: 'electrical-engineer', fieldKey: 'engineering', title: 'Jurutera Elektrik', description: 'Mereka bentuk sistem dan peralatan elektrik.', minStudyLevel: 'degree' },
    { key: 'accounts-assistant', fieldKey: 'business', title: 'Pembantu Akaun', description: 'Merekod transaksi dan menyediakan penyata ringkas.', minStudyLevel: 'diploma' },
    { key: 'accountant', fieldKey: 'business', title: 'Akauntan', description: 'Menyediakan dan menyemak laporan kewangan.', minStudyLevel: 'degree' },
    { key: 'graphic-designer', fieldKey: 'design', title: 'Pereka Grafik', description: 'Menghasilkan reka bentuk visual untuk cetakan dan digital.', minStudyLevel: 'certificate' },
    { key: 'doctor', fieldKey: 'health', title: 'Doktor Perubatan', description: 'Merawat dan menjaga kesihatan pesakit.', minStudyLevel: 'degree' },
  ],

  activities: [
    { key: 'circuit', fieldKey: 'engineering', title: 'Reka litar mudah', type: 'hands_on' },
    { key: 'logic-puzzle', fieldKey: 'computing', title: 'Teka-teki logik pengaturcaraan', type: 'puzzle' },
    { key: 'poster', fieldKey: 'design', title: 'Reka poster kempen sekolah', type: 'creative' },
    { key: 'virtual-lab', fieldKey: 'pure-science', title: 'Makmal maya: tindak balas kimia', type: 'simulation' },
    { key: 'mini-business', fieldKey: 'business', title: 'Rancang perniagaan kecil', type: 'scenario' },
  ],

  admissionStats: [
    { programmeKey: 'dip-cs', intakeYear: 2023, lowestMerit: 74.5, averageMerit: 81.2, applicants: 820, places: 120 },
    { programmeKey: 'dip-cs', intakeYear: 2024, lowestMerit: 76.0, averageMerit: 82.4, applicants: 910, places: 120 },
    { programmeKey: 'dip-cs', intakeYear: 2025, lowestMerit: 75.2, averageMerit: 81.9, applicants: 880, places: 125 },
    { programmeKey: 'dip-ee', intakeYear: 2024, lowestMerit: 70.1, averageMerit: 77.5, applicants: 540, places: 90 },
    { programmeKey: 'dip-ee', intakeYear: 2025, lowestMerit: 71.3, averageMerit: 78.0, applicants: 560, places: 90 },
  ],
};
