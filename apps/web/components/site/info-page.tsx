import Image from 'next/image';
import type { ReactNode } from 'react';
import { PageHeading } from './page-heading';
import { SheetCrop } from './sheet-crop';

export type Tile = { title: string; body: string; picture: { sheet: 'worlds'; col: 0 | 1 | 2; row: 0 | 1 } | { src: string } };

/**
 * The inner public pages' frame (About, Guide): heading, a column of cards, then three picture tiles.
 * Kept to the 1200px column with the same margins as the landing page.
 */
export function InfoPage({ kicker, title, intro, cards, tiles }: { kicker: string; title: string; intro: string; cards: ReactNode; tiles: Tile[] }) {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-12 sm:px-6 lg:gap-12 lg:py-[50px]">
      <div className="flex max-w-[1108px] flex-col gap-6">
        <PageHeading kicker={kicker} title={title} intro={intro} />
        {cards}
      </div>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-3">
        {tiles.map((x) => (
          <li key={x.title} className="flex items-center gap-4 rounded-[20px] bg-bg p-4">
            {'src' in x.picture ? (
              <Image src={x.picture.src} alt="" width={120} height={120} className="size-[100px] shrink-0 object-contain sm:size-[120px]" />
            ) : (
              <SheetCrop sheet={x.picture.sheet} col={x.picture.col} row={x.picture.row} size={120} />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-[19px] font-semibold leading-snug">{x.title}</h2>
              <p className="text-[14px] text-muted">{x.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One plain card: a title and a line or two, on the light grey of the design. */
export function InfoCard({ title, body, as: Tag = 'h2' }: { title: string; body: string; as?: 'h2' | 'h3' }) {
  return (
    <div className="flex flex-col gap-2 rounded-[18px] bg-bg px-5 py-5">
      <Tag className="text-[19px] font-semibold">{title}</Tag>
      <p className="text-[15px] text-muted">{body}</p>
    </div>
  );
}
