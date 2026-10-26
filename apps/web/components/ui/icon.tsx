import Image from 'next/image';

/** A decorative SVG icon from /public/icons (or /public/brand). SVGs are served as-is, without resizing. */
export function Icon({ src, size, className }: { src: string; size: number; className?: string }) {
  return <Image src={src} alt="" width={size} height={size} unoptimized className={className} />;
}
