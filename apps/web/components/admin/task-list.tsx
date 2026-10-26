import Link from 'next/link';
import type { AdminTask } from '@/lib/admin/api';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { AdminIcon, type AdminIconName } from './icons';
import { EmptyState, StatusChip, buttonClass, timeAgo } from './ui';

/** Where a task opens: the programme page, the requirement editor / review screen, or the institution's settings. */
export function taskHref(task: AdminTask, locale: Locale): string {
  if (task.kind === 'institution') return `/${locale}/admin/institusi/${task.institutionId}?tab=tetapan`;
  return task.kind === 'programme' ? `/${locale}/admin/program/${task.programmeId}` : `/${locale}/admin/syarat/${task.id}`;
}

const KIND_ICON: Record<AdminTask['kind'], AdminIconName> = { programme: 'programme', requirement: 'listChecks', institution: 'building' };

/** One line per task: what it is, its status, how long it has waited, and the button to open it. */
export function TaskList({ tasks, locale, dict, now, action, empty }: { tasks: AdminTask[]; locale: Locale; dict: Dictionary; now: number; action: string; empty: string }) {
  const t = dict.admin;
  if (tasks.length === 0) return <EmptyState icon="checkCircle" text={empty} />;
  const routes: Record<string, string> = dict.requirements.routes;
  return (
    <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[14px] border border-line">
      {tasks.map((task) => (
        <li key={`${task.kind}:${task.id}`} className="flex flex-col gap-2 bg-white px-4 py-3 transition-colors duration-150 hover:bg-bg/70 sm:flex-row sm:items-center sm:gap-4">
          <span className={`hidden size-10 shrink-0 items-center justify-center rounded-[10px] sm:flex ${task.kind === 'institution' ? 'bg-red/10 text-[#b33a35]' : 'bg-blue text-navy'}`}>
            <AdminIcon name={KIND_ICON[task.kind]} size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate font-semibold">{task.programmeName}</p>
            <p className="text-[13px] text-muted">
              {task.institutionName && `${task.institutionName} · `}
              {task.kind === 'institution'
                ? t.tasks.institution
                : task.kind === 'programme'
                  ? task.isChange
                    ? t.tasks.change
                    : t.tasks.programme
                  : format(t.tasks.requirement, { route: routes[task.entryRoute ?? ''] ?? task.entryRoute ?? '', version: task.versionNo ?? 1 })}
            </p>
            {task.returnReason && task.status === 'returned' && <p className="text-[13px] text-[#b33a35]">{format(t.tasks.reason, { reason: task.returnReason })}</p>}
          </div>
          <div className="flex items-center gap-3">
            <StatusChip status={task.status} t={t} />
            <span className="inline-flex w-28 items-center gap-1 text-[13px] text-muted">
              <AdminIcon name="clock" size={13} />
              {timeAgo(task.updatedAt, now, t)}
            </span>
            <Link href={taskHref(task, locale)} className={`${buttonClass('secondary', 'sm')} group`}>
              <span>{action}</span>
              <AdminIcon name="arrowRight" size={15} className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
