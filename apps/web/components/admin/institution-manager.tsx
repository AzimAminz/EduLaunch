'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { AdminInstitution } from '@/lib/admin/api';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { InstitutionForm } from './institution-form';
import { AdminHeading } from './ui';

type T = Dictionary['admin'];

/**
 * The institution list: each row says how many programmes it has and opens the institution's profile, where its
 * programmes, sources and settings live. "Add institution" opens the form here; saving opens the new profile.
 */
export function InstitutionManager({ locale, rows, t, noMatches }: { locale: Locale; rows: AdminInstitution[]; t: T; noMatches: string }) {
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
            <button type="button" onClick={() => setAdding(true)} className="rounded-[10px] bg-yellow px-4 py-2.5 text-sm font-semibold hover:bg-yellow/85">
              {i.add}
            </button>
          )
        }
      />
      {adding && (
        <section className="rounded-[14px] border border-navy/20 bg-white p-4">
          <InstitutionForm locale={locale} t={t} noMatches={noMatches} onCancel={() => setAdding(false)} />
        </section>
      )}

      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-white">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                <Link href={`/${locale}/admin/institusi/${row.id}`} className="hover:underline">
                  {row.name}
                </Link>
                {row.shortName && <span className="font-normal text-muted">({row.shortName})</span>}
                {row.deletionRequestedBy && <span className="rounded-full bg-red/10 px-2 py-0.5 text-xs font-semibold text-[#b33a35]">{i.danger.title}</span>}
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
            <Link href={`/${locale}/admin/institusi/${row.id}`} className="self-start rounded-[10px] bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 sm:self-auto">
              {i.open}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
