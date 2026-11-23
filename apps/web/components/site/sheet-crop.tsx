import Image from 'next/image';

/**
 * One picture from a 3 × 2 illustration sheet (as the Figma file crops them): the sheet is drawn at three times the
 * box width and shifted to the chosen cell, inside a box that hides the rest.
 */
export function SheetCrop({ sheet, col, row, size, className = '' }: { sheet: 'worlds' | 'detective'; col: 0 | 1 | 2; row: 0 | 1; size: number; className?: string }) {
  return (
    <div aria-hidden className={`relative shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <Image
        src={`/landing/${sheet}.png`}
        alt=""
        width={size * 3}
        height={size * 2}
        sizes={`${size * 3}px`}
        className="pointer-events-none absolute max-w-none object-contain"
        style={{ width: size * 3, height: size * 2, left: -col * size, top: -row * size }}
      />
    </div>
  );
}
