import { describe, expect, it } from 'vitest';
import { groupCategories, linesFromText, parseRequirementText, suggestRules, type MatchableSubject, type TextBlock } from './epanduan-text';

// Real text from ePanduan (UTM, STPM category), as the content service keeps it.
const GENERAL = [
  'SPM',
  'Memiliki Sijil Pelajaran Malaysia (SPM) dengan mendapat sekurang-kurangnya:-',
  '• Gred C bagi matapelajaran BAHASA MELAYU / BAHASA MELAYU (KERTAS JULAI).',
  '• Gred E bagi matapelajaran SEJARAH mulai tahun 2013.',
  'DAN',
  'STPM',
  '• Purata Nilai Gred Kumulatif (PNGK) 2.00.',
  '• DUA (2) Gred C dalam mana-mana matapelajaran yang belum dikira.',
  'DAN',
  'MUET',
  'Mendapat sekurang-kurangnya BAND 1.0 dalam Malaysian University English Test (MUET) untuk peperiksaan yang bermula Sesi 1 tahun 2021.',
].join('\n');

const SPECIAL = [
  '• Mendapat sekurang-kurangnya Gred C dalam TIGA (3) mata pelajaran di peringkat STPM:',
  '  - Mathematics M / Mathematics T',
  '  - Physics',
  '  - Chemistry',
  'ATAU',
  'Mendapat sekurang-kurangnya Gred C dalam SATU (1) mata pelajaran di peringkat SPM:',
  '  - Fizik',
  '• Lulus ujian dan / atau temu duga yang ditetapkan oleh Universiti Awam.',
  'Catatan:',
].join('\n');

const SUBJECTS: MatchableSubject[] = [
  { id: 'bm', qualification: 'spm', keywords: ['Bahasa Melayu', 'Malay Language'] },
  { id: 'sej', qualification: 'spm', keywords: ['Sejarah', 'History'] },
  { id: 'fiz', qualification: 'spm', keywords: ['Fizik', 'Physics'] },
  { id: 'fiz-stpm', qualification: 'stpm', keywords: ['Fizik (STPM)', 'Physics'] },
  { id: 'kim-stpm', qualification: 'stpm', keywords: ['Kimia (STPM)', 'Chemistry'] },
  { id: 'mat-stpm', qualification: 'stpm', keywords: ['Matematik T (STPM)', 'Mathematics T'] },
];
const anyGrade = () => true;
const items = (text: string) => parseRequirementText(text).filter((b): b is Extract<TextBlock, { kind: 'item' }> => b.kind === 'item');

describe('parseRequirementText', () => {
  it('reads headings, items with their section, subject lists and DAN / ATAU', () => {
    const blocks = parseRequirementText(GENERAL);
    expect(blocks.filter((b) => b.kind === 'heading').map((b) => b.text)).toEqual(['SPM', 'STPM', 'MUET']);
    expect(blocks.filter((b) => b.kind === 'join').map((b) => b.text)).toEqual(['DAN', 'DAN']);
    expect(items(GENERAL)[1]).toMatchObject({ text: 'Gred C bagi matapelajaran BAHASA MELAYU / BAHASA MELAYU (KERTAS JULAI).', section: 'SPM' });
    expect(items(SPECIAL)[0]!.subjects).toEqual(['Mathematics M / Mathematics T', 'Physics', 'Chemistry']);
  });
});

describe('suggestRules', () => {
  it('turns simple lines into rules', () => {
    const [intro, bm, sejarah, cgpa, credits, muet] = items(GENERAL);
    expect(suggestRules(intro!, SUBJECTS, anyGrade)).toEqual({ kind: 'text', type: 'note' });
    expect(suggestRules(bm!, SUBJECTS, anyGrade)).toMatchObject({ kind: 'rules', rules: [{ type: 'min_grade', subjectId: 'bm', grade: 'C' }] });
    expect(suggestRules(sejarah!, SUBJECTS, anyGrade)).toMatchObject({ rules: [{ subjectId: 'sej', grade: 'E' }] });
    expect(suggestRules(cgpa!, SUBJECTS, anyGrade)).toMatchObject({ rules: [{ type: 'min_cgpa', value: '2.00' }] });
    expect(suggestRules(credits!, SUBJECTS, anyGrade)).toMatchObject({ rules: [{ type: 'min_credits', grade: 'C', value: '2' }] });
    expect(suggestRules(muet!, SUBJECTS, anyGrade)).toMatchObject({ rules: [{ type: 'min_muet', value: '1.0' }] });
  });

  it('writes "N subjects from a list" with the subjects found at that level, and conditions as declarations', () => {
    const [threeOf, oneOf, interview] = items(SPECIAL);
    expect(suggestRules(threeOf!, SUBJECTS, anyGrade)).toEqual({
      kind: 'rules',
      rules: [{ type: 'subjects_from_list', subjectId: null, subjectIds: ['mat-stpm', 'fiz-stpm', 'kim-stpm'], grade: 'C', value: '', count: '3' }],
    });
    expect(suggestRules(oneOf!, SUBJECTS, anyGrade)).toMatchObject({ rules: [{ type: 'subjects_from_list', subjectIds: ['fiz'], count: '1' }] });
    expect(suggestRules(interview!, SUBJECTS, anyGrade)).toEqual({ kind: 'text', type: 'declaration' });
  });

  it('keeps a line with an unknown subject as text, and leaves a grade the subject cannot take empty', () => {
    expect(suggestRules(items('• Gred A bagi matapelajaran SENI KHAT.')[0]!, SUBJECTS, anyGrade)).toEqual({ kind: 'text', type: 'note', reason: 'subject' });
    expect(suggestRules(items('• Gred C+ bagi matapelajaran BAHASA MELAYU.')[0]!, SUBJECTS, (_id, g) => g !== 'C+')).toMatchObject({ rules: [{ subjectId: 'bm', grade: null }] });
  });
});

describe('linesFromText', () => {
  it('turns Syarat Am into lines with sections, and Syarat Khas with its ATAU', () => {
    const general = linesFromText(GENERAL, 'general', SUBJECTS, anyGrade);
    expect(general.map((l) => [l.section, l.type])).toEqual([
      ['SPM', 'note'],
      ['SPM', 'min_grade'],
      ['SPM', 'min_grade'],
      ['STPM', 'min_cgpa'],
      ['STPM', 'min_credits'],
      ['MUET', 'min_muet'],
    ]);
    expect(general.every((l) => l.part === 'general')).toBe(true);
    const special = linesFromText(SPECIAL, 'special', SUBJECTS, anyGrade);
    expect(special.map((l) => [l.type, l.join])).toEqual([
      ['subjects_from_list', 'and'],
      ['subjects_from_list', 'or'],
      ['declaration', 'and'],
    ]);
    expect(special[1]!.text).toBe('Mendapat sekurang-kurangnya Gred C dalam SATU (1) mata pelajaran di peringkat SPM: Fizik');
  });
});

describe('groupCategories', () => {
  it('shows categories with the same requirement text once, keeping the order found', () => {
    const groups = groupCategories(
      [
        { jenprog: 'stpm', category: 'S', route: 'stpm', generalRequirements: 'STPM …' },
        { jenprog: 'stpm', category: 'G1', route: 'diploma', generalRequirements: 'DIPLOMA …' },
        { jenprog: 'stpm', category: 'A', route: 'stpm', generalRequirements: 'STPM …' },
      ],
      [
        { category: 'S', status: 'done', text: '• PNGK 2.00' },
        { category: 'A', status: 'done', text: '• PNGK 2.00' },
      ],
    );
    expect(groups.map((g) => g.categories.map((c) => c.category))).toEqual([['S', 'A'], ['G1']]);
    expect(groups[1]!.special).toBeNull();
  });
});
