import Link from 'next/link';
import type { AdminTask } from '@/lib/admin/api';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { StatusChip, timeAgo } from './ui';

/** Where a task opens: the programme page, the requirement editor / review screen, or the institution's settings. */
export function taskHref(task: AdminTask, locale: Locale): string {
  if (task.kind === 'institution') return `/${locale}/admin/institusi/${task.institutionId}?tab=tetapan`;
  return task.kind === 'programme' ? `/${locale}/admin/program/${task.programmeId}` : `/${locale}/admin/syarat/${task.id}`;
}

/** One line per task: what it is, its status, how long it has waited, and the button to open it. */
export function TaskList({ tasks, locale, dict, now, action, empty }: { tasks: AdminTask[]; locale: Locale; dict: Dictionary; now: number; action: string; empty: string }) {
  const t = dict.admin;
  if (tasks.length === 0) return <p className="rounded-[12px] bg-bg px-4 py-3 text-sm text-muted">{empty}</p>;
  const routes: Record<string, string> = dict.requirements.routes;
  return (
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[14px] border border-line">
      {tasks.map((task) => (
        <li key={`${task.kind}:${task.id}`} className="flex flex-col gap-2 bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate font-semibold">{task.programmeName}</p>
            <p className="text-[13px] text-muted">
              {task.institutionName && `${task.institutionName} · `}
              {task.kind === 'institution'
                ? t.tasks.institution
                : task.kind === 'programme'
                  ? t.tasks.programme
                  : format(t.tasks.requirement, { route: routes[task.entryRoute ?? ''] ?? task.entryRoute ?? '', version: task.versionNo ?? 1 })}
            </p>
            {task.returnReason && task.status === 'returned' && <p className="text-[13px] text-[#b33a35]">{format(t.tasks.reason, { reason: task.returnReason })}</p>}
          </div>
          <div className="flex items-center gap-3">
            <StatusChip status={task.status} t={t} />
            <span className="w-24 text-[13px] text-muted">{timeAgo(task.updatedAt, now, t)}</span>
            <Link href={taskHref(task, locale)} className="rounded-[10px] border border-line px-3.5 py-2 text-sm font-semibold hover:bg-bg">
              {action}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
