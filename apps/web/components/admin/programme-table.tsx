import Link from 'next/link';
import type { ProgrammeRow, ProgrammeSort } from '@/lib/admin/api';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { AdminIcon } from './icons';
import { EmptyState, IconText, SortHeader, StatusChip, buttonClass, timeAgo } from './ui';

export interface TableSort {
  sort: ProgrammeSort;
  direction: 'asc' | 'desc';
  /** The list's address sorted by a column in a direction, keeping its filters. */
  href: (sort: ProgrammeSort, direction: 'asc' | 'desc') => string;
}

/**
 * The quick action for a row: review what waits for review, edit what can be edited, nothing extra for archived.
 * The programme page then shows every action that applies (send, approve, withdraw, archive, delete…).
 */
function rowAction(p: ProgrammeRow, a: Dictionary['admin']['programme']['act']) {
  if (p.status === 'in_review' || p.pendingStatus === 'in_review') return { label: a.review, icon: 'eye' as const, edit: false };
  if (p.status === 'archived') return null;
  return { label: a.edit, icon: 'pencil' as const, edit: true };
}

/** Programmes as a table: sortable columns, status with icons, when it last changed, and clear row actions. */
export function ProgrammeTable({
  rows,
  locale,
  dict,
  now,
  sort,
  showInstitution = true,
}: {
  rows: ProgrammeRow[];
  locale: Locale;
  dict: Dictionary;
  now: number;
  sort?: TableSort;
  showInstitution?: boolean;
}) {
  const t = dict.admin;
  const c = t.programmes.columns;
  const routes: Record<string, string> = dict.requirements.routes;
  if (rows.length === 0) return <EmptyState icon="programme" text={t.programmes.empty} />;
  const header = (key: ProgrammeSort, label: string) =>
    sort ? (
      <SortHeader
        label={label}
        active={sort.sort === key}
        direction={sort.direction}
        // The same column again flips the order; another column starts ascending (newest first for "updated").
        href={sort.href(key, sort.sort === key ? (sort.direction === 'asc' ? 'desc' : 'asc') : key === 'updated' ? 'desc' : 'asc')}
      />
    ) : (
      <th className="px-4 py-3 font-medium">{label}</th>
    );

  return (
    <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="bg-bg text-[13px] text-muted">
          <tr>
            {header('name', c.programme)}
            {showInstitution && header('institution', c.institution)}
            {header('level', c.level)}
            <th className="px-4 py-3 font-medium">{c.requirements}</th>
            {header('status', c.status)}
            {header('updated', c.updated)}
            <th className="px-4 py-3 text-right font-medium">{c.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((p) => {
            const view = `/${locale}/admin/program/${p.id}`;
            const action = rowAction(p, t.programme.act);
            return (
              <tr key={p.id} className="transition-colors duration-150 hover:bg-bg/70">
                <td className="px-4 py-3">
                  <Link href={view} className="inline-flex items-center gap-2.5 font-semibold hover:underline">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-blue text-navy">
                      <AdminIcon name="programme" size={15} />
                    </span>
                    {p.name}
                  </Link>
                </td>
                {showInstitution && <td className="px-4 py-3">{p.institutionName ?? '—'}</td>}
                <td className="px-4 py-3">{dict.levels[p.studyLevel]}</td>
                <td className="px-4 py-3">
                  {p.publishedRoutes.length ? (
                    p.publishedRoutes.map((r) => routes[r] ?? r).join(', ')
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#b33a35]">
                      <AdminIcon name="alert" size={14} />
                      {t.programmes.noRequirements}
                    </span>
                  )}
                  {p.openDrafts > 0 && <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-xs font-semibold">{format(t.programmes.openDrafts, { count: p.openDrafts })}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StatusChip status={p.status} t={t} />
                    {p.pendingStatus && <span className="whitespace-nowrap rounded-full bg-yellow px-2 py-0.5 text-xs font-semibold">{t.programmes.changeBadge}</span>}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[13px] text-muted">{timeAgo(p.updatedAt, now, t)}</td>
                <td className="px-4 py-3">
                  <span className="flex justify-end gap-2">
                    <Link href={view} className={buttonClass('secondary', 'sm')}>
                      <IconText icon="eye">{t.institutions.open}</IconText>
                    </Link>
                    {action && (
                      <Link href={action.edit ? `${view}/sunting` : view} className={buttonClass('primary', 'sm')}>
                        <IconText icon={action.icon}>{action.label}</IconText>
                      </Link>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
