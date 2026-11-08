/** A grey block standing in for content that is still loading. */
function Bar({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`block rounded-[8px] bg-navy/[0.07] ${className}`} />;
}

/**
 * The shape of a page while its data loads: a heading, a toolbar and a list of rows, pulsing gently (still for
 * reduced motion). Shown at once on navigation, so the click is answered before the server replies.
 */
export function PageSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-busy className="flex animate-pulse flex-col gap-[22px] motion-reduce:animate-none">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-2.5">
        <Bar className="h-3.5 w-28" />
        <Bar className="h-8 w-2/3 max-w-[420px]" />
        <Bar className="h-4 w-1/2 max-w-[360px]" />
      </div>
      <div className="flex gap-2">
        <Bar className="h-9 w-28 rounded-full" />
        <Bar className="h-9 w-28 rounded-full" />
      </div>
      <div className="flex flex-col divide-y divide-line rounded-[18px] border border-line bg-white">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Bar className="size-10 shrink-0 rounded-[12px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bar className="h-4 w-3/5" />
              <Bar className="h-3 w-2/5" />
            </div>
            <Bar className="hidden h-7 w-20 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
