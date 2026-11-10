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

/** Frames in the Rimau strip, and the shape of one frame (from tools/scripts/rimau-sprite.py). */
const RIMAU_FRAMES = 48;
const RIMAU_FRAME = { width: 41, height: 64 };
/** Played at 24 frames a second; still for reduced motion. React adds this to the page once, however many Rimaus. */
const RIMAU_CSS = `.rimau-sprite{display:inline-block;flex-shrink:0;overflow:hidden;image-rendering:pixelated}
.rimau-sprite>img{height:100%;width:auto;max-width:none;image-rendering:pixelated;animation:rimau-play ${RIMAU_FRAMES / 24}s steps(${RIMAU_FRAMES}) infinite}
@keyframes rimau-play{to{transform:translateX(-100%)}}
@media (prefers-reduced-motion:reduce){.rimau-sprite>img{animation:none}}`;

/**
 * Rimau, the EduLaunch mascot, as pixel art made from its own illustration: 48 frames (swaying, breathing, a blink)
 * played at 24 frames a second by CSS, from one SVG file.
 */
export function Rimau({ height, className = '' }: { height: number; className?: string }) {
  const width = Math.round((height * RIMAU_FRAME.width) / RIMAU_FRAME.height);
  return (
    <span aria-hidden className={`rimau-sprite ${className}`} style={{ width, height }}>
      <style href="rimau-sprite" precedence="default">
        {RIMAU_CSS}
      </style>
      {/* eslint-disable-next-line @next/next/no-img-element -- a sprite strip moved by CSS, not a content image */}
      <img src="/sprites/rimau-idle.svg" alt="" width={width * RIMAU_FRAMES} height={height} decoding="async" />
    </span>
  );
}
