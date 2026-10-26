import type { CSSProperties } from 'react';
import { WORLD_CELL, type World } from '@/lib/catalogue/presentation';

/**
 * One cell of the 3 × 2 illustration sprite (public/illustrations/edu-worlds.png),
 * shown at `size` pixels square, as in the Figma cards and the evidence panel.
 * `inset` trims that many pixels from the left and right, so neighbouring pictures never show (Figma uses 7.67 at 230px).
 */
export function FieldIllustration({ world, size, inset = 0, className, style }: { world: World; size: number; inset?: number; className?: string; style?: CSSProperties }) {
  const { col, row } = WORLD_CELL[world];
  return (
    <div
      aria-hidden
      data-world={world}
      className={className}
      style={{
        width: size - inset * 2,
        height: size,
        backgroundImage: 'url(/illustrations/edu-worlds.png)',
        backgroundSize: `${size * 3}px ${size * 2}px`,
        backgroundPosition: `${-col * size - inset}px ${-row * size}px`,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  );
}
