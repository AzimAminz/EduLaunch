/**
 * Questions and answers that open one at a time on click (native <details>, so they work without JavaScript and with
 * the keyboard). The first starts open, as in the design.
 */
export function FaqList({ items, openFirst = true }: { items: ReadonlyArray<{ q: string; a: string }>; openFirst?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((x, i) => (
        <details key={x.q} name="soalan-lazim" open={openFirst && i === 0} className="group rounded-[18px] bg-bg open:bg-white open:shadow-[0_8px_30px_rgba(20,38,71,0.08)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-[17px] font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
            {x.q}
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xl leading-none group-open:bg-yellow">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <p className="px-5 pb-5 text-[15px] text-muted sm:px-6">{x.a}</p>
        </details>
      ))}
    </div>
  );
}
