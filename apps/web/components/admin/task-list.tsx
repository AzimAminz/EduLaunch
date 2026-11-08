import type { AdminTask } from '@/lib/admin/api';
import { withFrom } from '@/lib/admin/trail';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { EmptyState, RowArrow, RowLink, StatusChip, tableStyle as ts, timeAgo } from './ui';

/** Where a task opens: the programme page, the requirement editor / review screen, or the institution's settings. */
export function taskHref(task: AdminTask, locale: Locale): string {
  if (task.kind === 'institution') return `/${locale}/admin/institusi/${task.institutionId}?tab=tetapan`;
  return task.kind === 'programme' ? `/${locale}/admin/program/${task.programmeId}` : `/${locale}/admin/syarat/${task.id}`;
}

/**
 * The inbox as a table: what each task is (the whole row opens it), its status and how long it has waited, oldest
 * first. With bulk actions, programmes and requirements get a checkbox (institution deletions never do).
 */
export function TaskList({ tasks, locale, dict, now, empty, from, offset = 0, selectable = false }: {
  tasks: AdminTask[];
  locale: Locale;
  dict: Dictionary;
  now: number;
  /** Kept for callers; the row itself is the action now. */
  action?: string;
  empty: string;
  /** The inbox's own address, so the task's breadcrumb returns to this tab and page. */
  from: string;
  /** How many rows came before this page, so numbers carry on across pages. */
  offset?: number;
  selectable?: boolean;
}) {
  const t = dict.admin;
  if (tasks.length === 0) return <EmptyState text={empty} />;
  const routes: Record<string, string> = dict.requirements.routes;
  return (
    <div className={ts.shell}>
      <table className={`${ts.table} min-w-[640px]`}>
        <thead className={ts.head}>
          <tr>
            {selectable && <th className="w-10 pl-4" aria-label={t.tasks.bulk.selectAll} />}
            <th className={ts.numTh}>#</th>
            <th className={`${ts.th} w-[55%]`}>{t.tasks.columns.item}</th>
            <th className={ts.th}>{t.tasks.columns.status}</th>
            <th className={`${ts.th} text-right`}>{t.tasks.columns.waiting}</th>
            <th aria-hidden className="w-10" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, n) => (
            <tr key={`${task.kind}:${task.id}`} className={ts.row}>
              {selectable && (
                <td className="relative z-10 w-10 pl-4 align-middle">
                  {task.kind !== 'institution' && (
                    <>
                      <input type="checkbox" name="items" value={`${task.kind}|${task.id}`} aria-label={task.programmeName} className="size-4 cursor-pointer accent-[#1b2a4a]" />
                      <input type="hidden" name={`name-${task.id}`} value={task.programmeName} />
                      <input type="hidden" name={`status-${task.id}`} value={task.status} />
                    </>
                  )}
                </td>
              )}
              <td className={ts.numTd}>{offset + n + 1}</td>
              <td className={ts.td}>
                <RowLink href={withFrom(taskHref(task, locale), from)}>{task.programmeName}</RowLink>
                <p className={ts.sub}>
                  {task.institutionName && `${task.institutionName} · `}
                  {task.kind === 'institution'
                    ? t.tasks.institution
                    : task.kind === 'programme'
                      ? task.isChange
                        ? t.tasks.change
                        : t.tasks.programme
                      : format(t.tasks.requirement, { route: routes[task.entryRoute ?? ''] ?? task.entryRoute ?? '', version: task.versionNo ?? 1 })}
                </p>
                {task.returnReason && task.status === 'returned' && <p className="mt-0.5 text-[13px] text-[#831c1e]">{format(t.tasks.reason, { reason: task.returnReason })}</p>}
              </td>
              <td className={ts.td}>
                <StatusChip status={task.status} t={t} />
              </td>
              <td className={`${ts.td} whitespace-nowrap text-right text-[13px] tabular-nums text-muted`}>{timeAgo(task.updatedAt, now, t)}</td>
              <RowArrow />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
