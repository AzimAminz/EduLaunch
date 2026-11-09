import Link from 'next/link';
import { format, type Dictionary } from '@/lib/i18n/locale';

interface ProgrammeCardProps {
  id: string;
  href: string;
  programmeName: string;
  institutionName: string;
  meta: string;
  fields: string[];
  /** The newest average merit from ePanduan, when there is one. */
  averageMerit?: { intakeYear: number; value: number } | null;
  /** Requirements entered as sample data, not from an official source. */
  sample?: boolean;
  labels: Dictionary['card'];
}

/**
 * Directory card: the programme, where and what level, its fields, and its average merit when ePanduan shows one.
 * The whole card opens the programme; information only, so admins never have to upload pictures.
 */
export function ProgrammeCard({ href, programmeName, institutionName, meta, fields, averageMerit, sample, labels }: ProgrammeCardProps) {
  const shown = fields.slice(0, 2);
  return (
    <article className="group relative flex min-w-0 flex-col gap-3 rounded-[22px] bg-white p-5 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(20,39,71,0.25)] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-navy/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex flex-col gap-1">
        <h3 className="text-[18px] font-semibold leading-snug text-navy">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {programmeName}
          </Link>
        </h3>
        <p className="text-sm leading-tight text-muted">{institutionName}</p>
      </div>
      <p className="text-sm font-medium leading-tight text-navy">{meta}</p>
      {shown.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {shown.map((f) => (
            <li key={f} className="rounded-full bg-blue px-2.5 py-1 text-xs font-medium text-navy">
              {f}
            </li>
          ))}
          {fields.length > shown.length && <li className="rounded-full bg-bg px-2.5 py-1 text-xs font-medium text-muted">+{fields.length - shown.length}</li>}
        </ul>
      )}
      <div className="flex-1" />
      <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
        {averageMerit ? (
          <p className="flex flex-col">
            <span className="text-[12px] text-muted">{format(labels.merit, { year: averageMerit.intakeYear })}</span>
            <span className="text-[17px] font-semibold tabular-nums">{averageMerit.value.toFixed(2)}</span>
          </p>
        ) : sample ? (
          <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-[#8a6100]">{labels.sample}</span>
        ) : (
          <span />
        )}
        <span aria-hidden className="pointer-events-none text-sm font-semibold text-navy transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none">
          {labels.view} →
        </span>
      </div>
    </article>
  );
}
