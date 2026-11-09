/**
 * Pixel art drawn as SVG squares: each sprite is a few rows of letters, one colour per letter, so it costs nothing
 * to load and stays sharp at any size. Runs of the same colour on a row are merged into one rectangle.
 */
export function Sprite({ rows, palette, size, className = '', title }: { rows: string[]; palette: Record<string, string>; size: number; className?: string; title?: string }) {
  const width = Math.max(...rows.map((r) => r.length));
  const rects: Array<{ x: number; y: number; w: number; fill: string }> = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let end = x;
      while (end < row.length && row[end] === ch) end++;
      const fill = palette[ch];
      if (fill) rects.push({ x, y, w: end - x, fill });
      x = end;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${width} ${rows.length}`}
      width={size}
      height={(size * rows.length) / width}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={`px-crisp ${className}`}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

/** The quest's hero: a student in a yellow cap. */
export const HERO = [
  '..KKKKKK..',
  '.KYYYYYYK.',
  'KYYYYYYYYK',
  '.KKSSSSKK.',
  '.KSESSESK.',
  '.KSSSSSSK.',
  '..KKSSKK..',
  '.KBBBBBBK.',
  'KSKBBBBKSK',
  '.KKBBBBKK.',
  '..KDKKDK..',
  '..KKK.KKK.',
];
export const HERO_COLOURS = { K: '#0b1530', Y: '#ffd84d', S: '#f2c39b', E: '#0b1530', B: '#2f5bd3', D: '#1b2a4a' };

/** A flag on a pole, and a little star for the start screen. */
export const FLAG = ['K.....', 'KRRRR.', 'KRRRRR', 'KRRRR.', 'K.....', 'K.....', 'K.....'];
export const STAR = ['...Y...', '...Y...', '.YYYYY.', 'YYYYYYY', '.YYYYY.', '.YY.YY.', 'Y.....Y'];

const FACE_TOP = ['.KKKKKKK.', 'K.......K', 'K.K...K.K', 'K.......K'];
const MOUTHS = [
  ['K..KKK..K', 'K.K...K.K'],
  ['K..KKKK.K', 'K......KK'],
  ['K.......K', 'K.KKKKK.K'],
  ['K.K...K.K', 'K..KKK..K'],
  ['K.KKKKK.K', 'K..KKK..K'],
];
/** Faces from "strongly dislike" (0) to "strongly like" (4), drawn in the current text colour. */
export const face = (level: number) => [...FACE_TOP, ...MOUTHS[level]!, 'K.......K', '.KKKKKKK.'];
