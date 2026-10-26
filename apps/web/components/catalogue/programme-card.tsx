import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n/locale';
import { Icon } from '@/components/ui/icon';

export type RequirementStatus = 'sample' | 'published' | 'missing';

interface ProgrammeCardProps {
  id: string;
  href: string;
  programmeName: string;
  institutionName: string;
  meta: string;
  fields: string[];
  requirementStatus: RequirementStatus;
  labels: Dictionary['card'];
}

const STATUS_DOT: Record<RequirementStatus, string> = {
  sample: 'bg-yellow',
  published: 'bg-[#2e9b6a]',
  missing: 'bg-line',
};

/** Directory card: information only, so admins never have to upload pictures. */
export function ProgrammeCard({ href, programmeName, institutionName, meta, fields, requirementStatus, labels }: ProgrammeCardProps) {
  const status = { sample: labels.statusSample, published: labels.statusPublished, missing: labels.statusMissing }[requirementStatus];
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-[22px] bg-white p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-[19px] font-semibold leading-tight text-navy">{programmeName}</h3>
        <p className="text-sm leading-tight text-muted">{institutionName}</p>
      </div>
      <p className="text-sm font-medium leading-tight text-navy">{meta}</p>
      {fields.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {fields.map((f) => (
            <li key={f} className="rounded-full bg-blue px-2.5 py-1 text-xs font-medium text-navy">
              {f}
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-2 text-[13px] leading-tight text-muted">
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${STATUS_DOT[requirementStatus]}`} />
        {status}
      </p>
      <div className="flex-1" />
      <Link href={href} className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-navy p-4 text-base font-semibold text-white hover:bg-navy/90">
        {labels.view}
        <Icon src="/icons/arrow-right-white.svg" size={20} />
      </Link>
    </article>
  );
}
