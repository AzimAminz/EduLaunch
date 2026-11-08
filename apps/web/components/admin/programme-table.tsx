import type { ProgrammeRow, ProgrammeSort } from '@/lib/admin/api';
import { withFrom } from '@/lib/admin/trail';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { EmptyState, RowArrow, RowLink, SortHeader, StatusChip, tableStyle as ts, timeAgo } from './ui';

export interface TableSort {
  sort: ProgrammeSort;
  direction: 'asc' | 'desc';
  /** The list's address sorted by a column in a direction, keeping its filters. */
  href: (sort: ProgrammeSort, direction: 'asc' | 'desc') => string;
}

/**
 * Programmes as a table: the name opens the programme (the whole row is the link), then its level, which routes
 * already have published requirements, its status and when it last changed. Every link carries `from`, the list's
 * own address, so the programme's breadcrumb returns to this exact page, sort and filter.
 */
export function ProgrammeTable({
  rows,
  locale,
  dict,
  now,
  sort,
  from,
  showInstitution = true,
  empty,
  offset = 0,
}: {
  rows: ProgrammeRow[];
  locale: Locale;
  dict: Dictionary;
  now: number;
  sort?: TableSort;
  from: string;
  showInstitution?: boolean;
  /** What to say when no row is shown. */
  empty?: string;
  /** How many rows came before this page, so numbers carry on across pages. */
  offset?: number;
}) {
  const t = dict.admin;
  const c = t.programmes.columns;
  const routes: Record<string, string> = dict.requirements.routes;
  if (rows.length === 0) return <EmptyState text={empty ?? t.programmes.empty} />;
  const header = (key: ProgrammeSort, label: string, className = '') =>
    sort ? (
      <SortHeader
        label={label}
        active={sort.sort === key}
        direction={sort.direction}
        className={className}
        // The same column again flips the order; another column starts ascending (newest first for "updated").
        href={sort.href(key, sort.sort === key ? (sort.direction === 'asc' ? 'desc' : 'asc') : key === 'updated' ? 'desc' : 'asc')}
      />
    ) : (
      <th className={`${ts.th} ${className}`}>{label}</th>
    );

  return (
    <div className={ts.shell}>
      <table className={`${ts.table} min-w-[720px]`}>
        <thead className={ts.head}>
          <tr>
            <th className={ts.numTh}>#</th>
            {header('name', c.programme, 'w-[42%]')}
            {header('level', c.level)}
            <th className={ts.th}>{c.requirements}</th>
            {header('status', c.status)}
            {header('updated', c.updated, 'text-right [&>a]:flex-row-reverse')}
            <th aria-hidden className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p, n) => (
            <tr key={p.id} className={ts.row}>
              <td className={ts.numTd}>{offset + n + 1}</td>
              <td className={ts.td}>
                <RowLink href={withFrom(`/${locale}/admin/program/${p.id}`, from)}>{p.name}</RowLink>
                {showInstitution && <p className={`${ts.sub} truncate`}>{p.institutionName ?? t.programmes.noInstitution}</p>}
              </td>
              <td className={`${ts.td} whitespace-nowrap text-[13px]`}>{dict.levels[p.studyLevel]}</td>
              <td className={`${ts.td} text-[13px]`}>
                {p.publishedRoutes.length ? (
                  <span>{p.publishedRoutes.map((r) => routes[r] ?? r).join(', ')}</span>
                ) : (
                  <span className="text-[#8a5a00]">{t.programmes.noRequirements}</span>
                )}
                {p.openDrafts > 0 && <span className="text-muted"> · {format(t.programmes.openDrafts, { count: p.openDrafts })}</span>}
              </td>
              <td className={ts.td}>
                <StatusChip status={p.status} t={t} note={p.pendingStatus ? t.programmes.changeBadge : undefined} />
              </td>
              <td className={`${ts.td} whitespace-nowrap text-right text-[13px] tabular-nums text-muted`}>{timeAgo(p.updatedAt, now, t)}</td>
              <RowArrow />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
