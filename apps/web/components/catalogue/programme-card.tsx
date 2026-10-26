import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n/locale';
import { FieldIllustration } from './field-illustration';
import type { World } from '@/lib/catalogue/presentation';
import { Icon } from '@/components/ui/icon';

export type RequirementStatus = 'sample' | 'published' | 'missing';

interface ProgrammeCardProps {
  id: string;
  href: string;
  programmeName: string;
  institutionName: string;
  meta: string;
  world: World;
  background: string;
  requirementStatus: RequirementStatus;
  labels: Dictionary['card'];
}

/** Directory card from the Figma "Universiti & program" screen. */
export function ProgrammeCard({ href, programmeName, institutionName, meta, world, background, requirementStatus, labels }: ProgrammeCardProps) {
  const status = { sample: labels.statusSample, published: labels.statusPublished, missing: labels.statusMissing }[requirementStatus];
  return (
    <article className="flex min-w-0 flex-col gap-[9px] rounded-[22px] bg-white p-5">
      <h3 className="text-[19px] font-semibold leading-tight text-navy">{institutionName}</h3>
      <p className="text-sm leading-tight text-muted">{programmeName}</p>
      <div className="relative h-[150px] w-full overflow-hidden rounded-xl" style={{ backgroundColor: background }}>
        <FieldIllustration world={world} size={140} className="absolute top-[5px]" style={{ left: 'calc(50% - 33px)' }} />
      </div>
      <p className="text-sm leading-tight text-muted">{meta}</p>
      <p className="text-[13px] leading-tight text-muted">{status}</p>
      <Link href={href} className="mt-1 flex w-full items-center justify-center gap-2 rounded-[10px] bg-navy p-4 text-base font-semibold text-white hover:bg-navy/90">
        {labels.view}
        <Icon src="/icons/arrow-right-white.svg" size={20} />
      </Link>
    </article>
  );
}
