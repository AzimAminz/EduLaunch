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
    { key: 'computing', name: 'Komputer & Teknologi Maklumat', nameEn: 'Computing & IT', riasec: { R: 3, I: 5, A: 2, S: 1, E: 2, C: 4 } },
    { key: 'engineering', name: 'Kejuruteraan', nameEn: 'Engineering', riasec: { R: 5, I: 4, A: 1, S: 1, E: 2, C: 3 } },
    { key: 'health', name: 'Perubatan & Kesihatan', nameEn: 'Health & Medicine', riasec: { R: 2, I: 5, A: 1, S: 5, E: 1, C: 2 } },
    { key: 'pure-science', name: 'Sains Tulen', nameEn: 'Pure Science', riasec: { R: 2, I: 5, A: 1, S: 1, E: 1, C: 3 } },
    { key: 'business', name: 'Perniagaan & Perakaunan', nameEn: 'Business & Accounting', riasec: { R: 1, I: 2, A: 1, S: 2, E: 4, C: 5 } },
    { key: 'education', name: 'Pendidikan', nameEn: 'Education', riasec: { R: 1, I: 2, A: 3, S: 5, E: 2, C: 2 } },
    { key: 'design', name: 'Seni & Reka Bentuk', nameEn: 'Art & Design', riasec: { R: 2, I: 2, A: 5, S: 2, E: 2, C: 1 } },
    { key: 'social', name: 'Undang-undang & Sains Sosial', nameEn: 'Law & Social Science', riasec: { R: 1, I: 3, A: 2, S: 4, E: 4, C: 3 } },
    { key: 'technical', name: 'Teknikal & Vokasional (TVET)', nameEn: 'Technical & Vocational (TVET)', riasec: { R: 5, I: 2, A: 2, S: 1, E: 2, C: 2 } },
  ],

  subjects: [
    // SPM
    { key: 'spm-bm', name: 'Bahasa Melayu', nameEn: 'Malay Language', qualification: 'spm', category: 'core', isMandatory: true },
    { key: 'spm-bi', name: 'Bahasa Inggeris', nameEn: 'English Language', qualification: 'spm', category: 'core', isMandatory: true },
    { key: 'spm-math', name: 'Matematik', nameEn: 'Mathematics', qualification: 'spm', category: 'core', isMandatory: true },
    { key: 'spm-history', name: 'Sejarah', nameEn: 'History', qualification: 'spm', category: 'core', isMandatory: true },
    { key: 'spm-islam', name: 'Pendidikan Islam', nameEn: 'Islamic Education', qualification: 'spm', category: 'core', isMandatory: false },
    { key: 'spm-moral', name: 'Pendidikan Moral', nameEn: 'Moral Education', qualification: 'spm', category: 'core', isMandatory: false },
    { key: 'spm-science', name: 'Sains', nameEn: 'Science', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-addmath', name: 'Matematik Tambahan', nameEn: 'Additional Mathematics', qualification: 'spm', category: 'science', isMandatory: false, aliases: ['Add Maths', 'Add Math', 'MT'] },
    { key: 'spm-physics', name: 'Fizik', nameEn: 'Physics', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-chemistry', name: 'Kimia', nameEn: 'Chemistry', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-biology', name: 'Biologi', nameEn: 'Biology', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-accounting', name: 'Prinsip Perakaunan', nameEn: 'Principles of Accounting', qualification: 'spm', category: 'business', isMandatory: false, aliases: ['Akaun', 'Accounts'] },
    { key: 'spm-economics', name: 'Ekonomi', nameEn: 'Economics', qualification: 'spm', category: 'business', isMandatory: false },
    { key: 'spm-art', name: 'Pendidikan Seni Visual', nameEn: 'Visual Arts Education', qualification: 'spm', category: 'arts', isMandatory: false, aliases: ['PSV', 'Seni'] },
    { key: 'spm-arabic', name: 'Bahasa Arab', nameEn: 'Arabic Language', qualification: 'spm', category: 'language', isMandatory: false, aliases: ['Arab'] },
    { key: 'spm-chinese', name: 'Bahasa Cina', nameEn: 'Chinese Language', qualification: 'spm', category: 'language', isMandatory: false, aliases: ['Mandarin'] },
    { key: 'spm-tamil', name: 'Bahasa Tamil', nameEn: 'Tamil Language', qualification: 'spm', category: 'language', isMandatory: false },
    { key: 'spm-malay-lit', name: 'Kesusasteraan Melayu Komunikatif', nameEn: 'Communicative Malay Literature', qualification: 'spm', category: 'language', isMandatory: false, aliases: ['KMK', 'Sastera Melayu'] },
    { key: 'spm-eng-lit', name: 'Literature in English', nameEn: 'Literature in English', qualification: 'spm', category: 'language', isMandatory: false, aliases: ['Kesusasteraan Inggeris'] },
    { key: 'spm-pqs', name: 'Pendidikan Al-Quran dan As-Sunnah', nameEn: 'Al-Quran and As-Sunnah Education', qualification: 'spm', category: 'religion', isMandatory: false, aliases: ['PQS'] },
    { key: 'spm-psi', name: 'Pendidikan Syariah Islamiah', nameEn: 'Islamic Syariah Education', qualification: 'spm', category: 'religion', isMandatory: false, aliases: ['PSI'] },
    { key: 'spm-tasawwur', name: 'Tasawwur Islam', nameEn: 'Islamic Worldview', qualification: 'spm', category: 'religion', isMandatory: false, aliases: ['Tasawur Islam'] },
    { key: 'spm-usuluddin', name: 'Usul al-Din', nameEn: 'Usul al-Din', qualification: 'spm', category: 'religion', isMandatory: false, aliases: ['Usuluddin'] },
    { key: 'spm-syariah', name: 'Al-Syariah', nameEn: 'Al-Syariah', qualification: 'spm', category: 'religion', isMandatory: false, aliases: ['Syariah'] },
    { key: 'spm-geography', name: 'Geografi', nameEn: 'Geography', qualification: 'spm', category: 'humanities', isMandatory: false },
    { key: 'spm-cs', name: 'Sains Komputer', nameEn: 'Computer Science', qualification: 'spm', category: 'science', isMandatory: false, aliases: ['Komputer'] },
    { key: 'spm-sports-sci', name: 'Sains Sukan', nameEn: 'Sports Science', qualification: 'spm', category: 'science', isMandatory: false },
    { key: 'spm-business', name: 'Perniagaan', nameEn: 'Business', qualification: 'spm', category: 'business', isMandatory: false },
    { key: 'spm-gkt', name: 'Grafik Komunikasi Teknikal', nameEn: 'Technical Communication Graphics', qualification: 'spm', category: 'technical', isMandatory: false, aliases: ['GKT', 'Lukisan Kejuruteraan'] },
    { key: 'spm-invention', name: 'Reka Cipta', nameEn: 'Invention', qualification: 'spm', category: 'technical', isMandatory: false },
    { key: 'spm-agriculture', name: 'Pertanian', nameEn: 'Agriculture', qualification: 'spm', category: 'technical', isMandatory: false },
    { key: 'spm-home-sci', name: 'Sains Rumah Tangga', nameEn: 'Home Science', qualification: 'spm', category: 'technical', isMandatory: false },
    { key: 'spm-music', name: 'Pendidikan Muzik', nameEn: 'Music Education', qualification: 'spm', category: 'arts', isMandatory: false, aliases: ['Muzik'] },
    // Form 1–3 school exams (school grade scale, never converted to SPM)
    { key: 'sch-bm', name: 'Bahasa Melayu (sekolah)', nameEn: 'Malay Language (school)', qualification: 'school', category: 'core', isMandatory: true },
    { key: 'sch-bi', name: 'Bahasa Inggeris (sekolah)', nameEn: 'English Language (school)', qualification: 'school', category: 'core', isMandatory: true },
    { key: 'sch-math', name: 'Matematik (sekolah)', nameEn: 'Mathematics (school)', qualification: 'school', category: 'core', isMandatory: true },
    { key: 'sch-science', name: 'Sains (sekolah)', nameEn: 'Science (school)', qualification: 'school', category: 'science', isMandatory: true },
    { key: 'sch-history', name: 'Sejarah (sekolah)', nameEn: 'History (school)', qualification: 'school', category: 'core', isMandatory: true },
    { key: 'sch-rbt', name: 'Reka Bentuk dan Teknologi (sekolah)', nameEn: 'Design and Technology (school)', qualification: 'school', category: 'technical', isMandatory: false, aliases: ['RBT'] },
    { key: 'sch-islam', name: 'Pendidikan Islam (sekolah)', nameEn: 'Islamic Education (school)', qualification: 'school', category: 'religion', isMandatory: false },
    { key: 'sch-moral', name: 'Pendidikan Moral (sekolah)', nameEn: 'Moral Education (school)', qualification: 'school', category: 'religion', isMandatory: false },
    { key: 'sch-geography', name: 'Geografi (sekolah)', nameEn: 'Geography (school)', qualification: 'school', category: 'humanities', isMandatory: false },
    { key: 'sch-arabic', name: 'Bahasa Arab (sekolah)', nameEn: 'Arabic Language (school)', qualification: 'school', category: 'language', isMandatory: false, aliases: ['Arab'] },
    { key: 'sch-chinese', name: 'Bahasa Cina (sekolah)', nameEn: 'Chinese Language (school)', qualification: 'school', category: 'language', isMandatory: false, aliases: ['Mandarin'] },
    { key: 'sch-tamil', name: 'Bahasa Tamil (sekolah)', nameEn: 'Tamil Language (school)', qualification: 'school', category: 'language', isMandatory: false },
    { key: 'sch-art', name: 'Pendidikan Seni Visual (sekolah)', nameEn: 'Visual Arts Education (school)', qualification: 'school', category: 'arts', isMandatory: false, aliases: ['PSV'] },
    { key: 'sch-music', name: 'Pendidikan Muzik (sekolah)', nameEn: 'Music Education (school)', qualification: 'school', category: 'arts', isMandatory: false },
    { key: 'sch-computing', name: 'Asas Sains Komputer (sekolah)', nameEn: 'Basic Computer Science (school)', qualification: 'school', category: 'science', isMandatory: false, aliases: ['ASK'] },
    { key: 'sch-pe', name: 'Pendidikan Jasmani dan Kesihatan (sekolah)', nameEn: 'Physical and Health Education (school)', qualification: 'school', category: 'other', isMandatory: false, aliases: ['PJK'] },
    // STPM (Form 6) subjects, STPM grade scale
    { key: 'stpm-pa', name: 'Pengajian Am', nameEn: 'General Studies', qualification: 'stpm', category: 'core', isMandatory: true, aliases: ['PA'] },
    { key: 'stpm-bm', name: 'Bahasa Melayu (STPM)', nameEn: 'Malay Language (STPM)', qualification: 'stpm', category: 'language', isMandatory: false },
    { key: 'stpm-kmk', name: 'Kesusasteraan Melayu Komunikatif (STPM)', nameEn: 'Communicative Malay Literature (STPM)', qualification: 'stpm', category: 'language', isMandatory: false },
    { key: 'stpm-lit', name: 'Literature in English (STPM)', nameEn: 'Literature in English (STPM)', qualification: 'stpm', category: 'language', isMandatory: false },
    { key: 'stpm-chinese', name: 'Bahasa Cina (STPM)', nameEn: 'Chinese Language (STPM)', qualification: 'stpm', category: 'language', isMandatory: false },
    { key: 'stpm-tamil', name: 'Bahasa Tamil (STPM)', nameEn: 'Tamil Language (STPM)', qualification: 'stpm', category: 'language', isMandatory: false },
    { key: 'stpm-arabic', name: 'Bahasa Arab (STPM)', nameEn: 'Arabic Language (STPM)', qualification: 'stpm', category: 'language', isMandatory: false },
    { key: 'stpm-syariah', name: 'Syariah (STPM)', nameEn: 'Syariah (STPM)', qualification: 'stpm', category: 'religion', isMandatory: false },
    { key: 'stpm-usuluddin', name: 'Usuluddin (STPM)', nameEn: 'Usuluddin (STPM)', qualification: 'stpm', category: 'religion', isMandatory: false },
    { key: 'stpm-history', name: 'Sejarah (STPM)', nameEn: 'History (STPM)', qualification: 'stpm', category: 'humanities', isMandatory: false },
    { key: 'stpm-geography', name: 'Geografi (STPM)', nameEn: 'Geography (STPM)', qualification: 'stpm', category: 'humanities', isMandatory: false },
    { key: 'stpm-economics', name: 'Ekonomi (STPM)', nameEn: 'Economics (STPM)', qualification: 'stpm', category: 'business', isMandatory: false },
    { key: 'stpm-business', name: 'Pengajian Perniagaan (STPM)', nameEn: 'Business Studies (STPM)', qualification: 'stpm', category: 'business', isMandatory: false },
    { key: 'stpm-accounting', name: 'Perakaunan (STPM)', nameEn: 'Accounting (STPM)', qualification: 'stpm', category: 'business', isMandatory: false },
    { key: 'stpm-math-m', name: 'Matematik (M)', nameEn: 'Mathematics (M)', qualification: 'stpm', category: 'science', isMandatory: false, aliases: ['Math M', 'Matematik Pengurusan'] },
    { key: 'stpm-math-t', name: 'Matematik (T)', nameEn: 'Mathematics (T)', qualification: 'stpm', category: 'science', isMandatory: false, aliases: ['Math T'] },
    { key: 'stpm-ict', name: 'Teknologi Maklumat dan Komunikasi (STPM)', nameEn: 'Information and Communication Technology (STPM)', qualification: 'stpm', category: 'science', isMandatory: false, aliases: ['ICT'] },
    { key: 'stpm-physics', name: 'Fizik (STPM)', nameEn: 'Physics (STPM)', qualification: 'stpm', category: 'science', isMandatory: false },
    { key: 'stpm-chemistry', name: 'Kimia (STPM)', nameEn: 'Chemistry (STPM)', qualification: 'stpm', category: 'science', isMandatory: false },
    { key: 'stpm-biology', name: 'Biologi (STPM)', nameEn: 'Biology (STPM)', qualification: 'stpm', category: 'science', isMandatory: false },
    { key: 'stpm-sports', name: 'Sains Sukan (STPM)', nameEn: 'Sports Science (STPM)', qualification: 'stpm', category: 'science', isMandatory: false },
    { key: 'stpm-art', name: 'Seni Visual (STPM)', nameEn: 'Visual Arts (STPM)', qualification: 'stpm', category: 'arts', isMandatory: false },
    // Matriculation (KPM) and foundation subjects, 4.00-point letter grades
    { key: 'mat-math', name: 'Matematik (Matrikulasi)', nameEn: 'Mathematics (Matriculation)', qualification: 'matriculation', category: 'science', isMandatory: false, aliases: ['Matematik'] },
    { key: 'mat-chem', name: 'Kimia (Matrikulasi)', nameEn: 'Chemistry (Matriculation)', qualification: 'matriculation', category: 'science', isMandatory: false, aliases: ['Kimia'] },
    { key: 'mat-phys', name: 'Fizik (Matrikulasi)', nameEn: 'Physics (Matriculation)', qualification: 'matriculation', category: 'science', isMandatory: false, aliases: ['Fizik'] },
    { key: 'mat-bio', name: 'Biologi (Matrikulasi)', nameEn: 'Biology (Matriculation)', qualification: 'matriculation', category: 'science', isMandatory: false, aliases: ['Biologi'] },
    { key: 'mat-cs', name: 'Sains Komputer (Matrikulasi)', nameEn: 'Computer Science (Matriculation)', qualification: 'matriculation', category: 'science', isMandatory: false, aliases: ['Sains Komputer'] },
    { key: 'mat-eng', name: 'Asas Kejuruteraan (Matrikulasi)', nameEn: 'Engineering Fundamentals (Matriculation)', qualification: 'matriculation', category: 'technical', isMandatory: false, aliases: ['Kejuruteraan'] },
    { key: 'mat-acc', name: 'Perakaunan (Matrikulasi)', nameEn: 'Accounting (Matriculation)', qualification: 'matriculation', category: 'business', isMandatory: false, aliases: ['Perakaunan'] },
    { key: 'mat-econ', name: 'Ekonomi (Matrikulasi)', nameEn: 'Economics (Matriculation)', qualification: 'matriculation', category: 'business', isMandatory: false, aliases: ['Ekonomi'] },
    { key: 'mat-bm', name: 'Pengurusan Perniagaan (Matrikulasi)', nameEn: 'Business Management (Matriculation)', qualification: 'matriculation', category: 'business', isMandatory: false, aliases: ['Pengurusan Perniagaan'] },
    { key: 'mat-fin-acc', name: 'Perakaunan Kewangan (Matrikulasi)', nameEn: 'Financial Accounting (Matriculation)', qualification: 'matriculation', category: 'business', isMandatory: false, aliases: ['Financial Accounting'] },
    { key: 'mat-mgmt-acc', name: 'Perakaunan Pengurusan (Matrikulasi)', nameEn: 'Management Accounting (Matriculation)', qualification: 'matriculation', category: 'business', isMandatory: false, aliases: ['Management Accounting'] },
    { key: 'mat-bus-acc', name: 'Perakaunan Perniagaan (Matrikulasi)', nameEn: 'Business Accounting (Matriculation)', qualification: 'matriculation', category: 'business', isMandatory: false, aliases: ['Business Accounting'] },
    // Foundation (Asasi) subjects, 4.00-point letter grades. Common courses across university Asasi programmes
    // (science, social science, law, TESL, Islamic studies); students add any course not listed.
    { key: 'asasi-bio', name: 'Biologi (Asasi)', nameEn: 'Biology (Foundation)', qualification: 'foundation', category: 'science', isMandatory: false, aliases: ['Biologi', 'Biology'] },
    { key: 'asasi-chem', name: 'Kimia (Asasi)', nameEn: 'Chemistry (Foundation)', qualification: 'foundation', category: 'science', isMandatory: false, aliases: ['Kimia', 'Kimia Asas', 'Chemistry'] },
    { key: 'asasi-phys', name: 'Fizik (Asasi)', nameEn: 'Physics (Foundation)', qualification: 'foundation', category: 'science', isMandatory: false, aliases: ['Fizik', 'Fizik Asas', 'Physics'] },
    { key: 'asasi-math', name: 'Matematik (Asasi)', nameEn: 'Mathematics (Foundation)', qualification: 'foundation', category: 'science', isMandatory: false, aliases: ['Matematik', 'Mathematics'] },
    { key: 'asasi-stats', name: 'Statistik (Asasi)', nameEn: 'Statistics (Foundation)', qualification: 'foundation', category: 'science', isMandatory: false, aliases: ['Statistik', 'Statistics'] },
    { key: 'asasi-it', name: 'Teknologi Maklumat (Asasi)', nameEn: 'Information Technology (Foundation)', qualification: 'foundation', category: 'science', isMandatory: false, aliases: ['Sains Komputer', 'IT', 'Computer Science'] },
    { key: 'asasi-eng-lang', name: 'Bahasa Inggeris (Asasi)', nameEn: 'English (Foundation)', qualification: 'foundation', category: 'language', isMandatory: false, aliases: ['English', 'English for Foundation Studies'] },
    { key: 'asasi-eng-lit', name: 'Kesusasteraan Inggeris (Asasi)', nameEn: 'English Literature (Foundation)', qualification: 'foundation', category: 'language', isMandatory: false, aliases: ['Literature', 'Drama'] },
    { key: 'asasi-acc', name: 'Prinsip Perakaunan (Asasi)', nameEn: 'Principles of Accounting (Foundation)', qualification: 'foundation', category: 'business', isMandatory: false, aliases: ['Perakaunan', 'Accounting'] },
    { key: 'asasi-econ', name: 'Ekonomi (Asasi)', nameEn: 'Economics (Foundation)', qualification: 'foundation', category: 'business', isMandatory: false, aliases: ['Ekonomi', 'Economics'] },
    { key: 'asasi-bus', name: 'Pengurusan Perniagaan (Asasi)', nameEn: 'Business Management (Foundation)', qualification: 'foundation', category: 'business', isMandatory: false, aliases: ['Pengurusan', 'Business'] },
    { key: 'asasi-law', name: 'Pengenalan Undang-undang (Asasi)', nameEn: 'Introduction to Law (Foundation)', qualification: 'foundation', category: 'humanities', isMandatory: false, aliases: ['Undang-undang', 'Law'] },
    { key: 'asasi-islamic', name: 'Pengajian Islam (Asasi)', nameEn: 'Islamic Studies (Foundation)', qualification: 'foundation', category: 'religion', isMandatory: false, aliases: ['Pengajian Islam', 'Islamic Studies'] },
    { key: 'asasi-arabic', name: 'Bahasa Arab (Asasi)', nameEn: 'Arabic (Foundation)', qualification: 'foundation', category: 'language', isMandatory: false, aliases: ['Bahasa Arab', 'Arabic'] },
    // A-Level subjects, A*–E
    { key: 'al-math', name: 'Mathematics (A-Level)', nameEn: 'Mathematics (A-Level)', qualification: 'a_level', category: 'science', isMandatory: false, aliases: ['Matematik', 'Maths'] },
    { key: 'al-further-math', name: 'Further Mathematics (A-Level)', nameEn: 'Further Mathematics (A-Level)', qualification: 'a_level', category: 'science', isMandatory: false, aliases: ['Further Maths'] },
    { key: 'al-physics', name: 'Physics (A-Level)', nameEn: 'Physics (A-Level)', qualification: 'a_level', category: 'science', isMandatory: false, aliases: ['Fizik'] },
    { key: 'al-chemistry', name: 'Chemistry (A-Level)', nameEn: 'Chemistry (A-Level)', qualification: 'a_level', category: 'science', isMandatory: false, aliases: ['Kimia'] },
    { key: 'al-biology', name: 'Biology (A-Level)', nameEn: 'Biology (A-Level)', qualification: 'a_level', category: 'science', isMandatory: false, aliases: ['Biologi'] },
    { key: 'al-cs', name: 'Computer Science (A-Level)', nameEn: 'Computer Science (A-Level)', qualification: 'a_level', category: 'science', isMandatory: false, aliases: ['Sains Komputer'] },
    { key: 'al-economics', name: 'Economics (A-Level)', nameEn: 'Economics (A-Level)', qualification: 'a_level', category: 'business', isMandatory: false, aliases: ['Ekonomi'] },
    { key: 'al-accounting', name: 'Accounting (A-Level)', nameEn: 'Accounting (A-Level)', qualification: 'a_level', category: 'business', isMandatory: false, aliases: ['Perakaunan'] },
    { key: 'al-business', name: 'Business (A-Level)', nameEn: 'Business (A-Level)', qualification: 'a_level', category: 'business', isMandatory: false, aliases: ['Perniagaan'] },
    { key: 'al-psychology', name: 'Psychology (A-Level)', nameEn: 'Psychology (A-Level)', qualification: 'a_level', category: 'humanities', isMandatory: false, aliases: ['Psikologi'] },
    { key: 'al-law', name: 'Law (A-Level)', nameEn: 'Law (A-Level)', qualification: 'a_level', category: 'humanities', isMandatory: false, aliases: ['Undang-undang'] },
    { key: 'al-lit', name: 'English Literature (A-Level)', nameEn: 'English Literature (A-Level)', qualification: 'a_level', category: 'language', isMandatory: false },
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
