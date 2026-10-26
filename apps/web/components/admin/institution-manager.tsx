'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { AdminInstitution } from '@/lib/admin/api';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { InstitutionForm } from './institution-form';
import { AdminIcon } from './icons';
import { AdminHeading, EmptyState, IconText, buttonClass } from './ui';

type T = Dictionary['admin'];

/**
 * The institution list: each row says how many programmes it has and opens the institution's profile, where its
 * programmes, sources and settings live. "Add institution" opens the form here; saving opens the new profile.
 * The page passes one page of rows, already searched and sorted, with its own search bar and page links.
 */
export function InstitutionManager({
  locale,
  rows,
  t,
  noMatches,
  toolbar,
  footer,
  empty,
}: {
  locale: Locale;
  rows: AdminInstitution[];
  t: T;
  noMatches: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  /** What to say when no row is shown (none yet, or none matches the search). */
  empty: string;
}) {
  const i = t.institutions;
  const [adding, setAdding] = useState(false);
  const types: Record<string, string> = i.types;

  return (
    <div className="flex flex-col gap-4">
      <AdminHeading
        title={i.title}
        intro={i.intro}
        actions={
          !adding && (
            <button type="button" onClick={() => setAdding(true)} className={buttonClass('accent')}>
              <IconText icon="plus">{i.add}</IconText>
            </button>
          )
        }
      />
      {adding && (
        <section className="rounded-[14px] border border-navy/20 bg-white p-4">
          <InstitutionForm locale={locale} t={t} noMatches={noMatches} onCancel={() => setAdding(false)} />
        </section>
      )}

      {toolbar}
      {rows.length === 0 ? (
        <EmptyState icon="building" text={empty} />
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-white">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 px-4 py-3 transition-colors duration-150 hover:bg-bg/70 sm:flex-row sm:items-center sm:gap-4">
              <span className="hidden size-10 shrink-0 items-center justify-center rounded-[10px] bg-blue text-navy sm:flex">
                <AdminIcon name="building" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <Link href={`/${locale}/admin/institusi/${row.id}`} className="hover:underline">
                    {row.name}
                  </Link>
                  {row.shortName && <span className="font-normal text-muted">({row.shortName})</span>}
                  {row.deletionRequestedBy && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red/10 px-2 py-0.5 text-xs font-semibold text-[#b33a35]">
                      <AdminIcon name="alert" size={12} />
                      {i.danger.title}
                    </span>
                  )}
                </p>
                <p className="text-[13px]">
                  {row.programmes ? (
                    <>
                      <span className="font-semibold">{format(i.programmeCount, { count: row.programmes })}</span>
                      {/* Only the parts that apply, e.g. "4 programmes · 3 published · 1 archived". */}
                      {(
                        [
                          [row.published, i.countPublished],
                          [row.open, i.countOpen],
                          [row.programmes - row.published - row.open, i.countArchived],
                        ] as const
                      )
                        .filter(([n]) => n > 0)
                        .map(([n, text]) => (
                          <span key={text} className="text-muted">
                            {' · '}
                            {format(text, { count: n })}
                          </span>
                        ))}
                    </>
                  ) : (
                    <span className="text-muted">{i.noProgrammes}</span>
                  )}
                </p>
                <p className="text-[13px] text-muted">{[types[row.type] ?? row.type, row.state].filter(Boolean).join(' · ')}</p>
              </div>
              <Link href={`/${locale}/admin/institusi/${row.id}`} className={`${buttonClass('primary', 'sm')} group self-start sm:self-auto`}>
                <span>{i.open}</span>
                <AdminIcon name="arrowRight" size={16} className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {footer}
    </div>
  );
}
