import Link from 'next/link';
import type { ProgrammeRow } from '@/lib/admin/api';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { StatusChip } from './ui';

/**
 * The quick action for a row: review what waits for review, edit what can be edited, otherwise open it.
 * The programme page then shows every action that applies (send, approve, withdraw, archive…).
 */
function rowAction(p: ProgrammeRow, a: Dictionary['admin']['programme']['act'], open: string) {
  if (p.status === 'in_review' || p.pendingStatus === 'in_review') return { label: a.review, edit: false };
  if (p.status === 'archived') return { label: open, edit: false };
  return { label: a.edit, edit: true };
}

/** Programmes as a table: name, institution, level, published routes and open drafts, status, and a clear action. */
export function ProgrammeTable({ rows, locale, dict, showInstitution = true }: { rows: ProgrammeRow[]; locale: Locale; dict: Dictionary; showInstitution?: boolean }) {
  const t = dict.admin;
  const routes: Record<string, string> = dict.requirements.routes;
  if (rows.length === 0) return <p className="rounded-[14px] border border-line bg-white px-5 py-4 text-sm text-muted">{t.programmes.empty}</p>;
  return (
    <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-bg text-[13px] text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">{t.programmes.columns.programme}</th>
            {showInstitution && <th className="px-4 py-3 font-medium">{t.programmes.columns.institution}</th>}
            <th className="px-4 py-3 font-medium">{t.programmes.columns.level}</th>
            <th className="px-4 py-3 font-medium">{t.programmes.columns.requirements}</th>
            <th className="px-4 py-3 font-medium">{t.programmes.columns.status}</th>
            <th className="px-4 py-3 text-right font-medium">{t.programmes.columns.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-bg/60">
              <td className="px-4 py-3">
                <Link href={`/${locale}/admin/program/${p.id}`} className="font-semibold hover:underline">
                  {p.name}
                </Link>
              </td>
              {showInstitution && <td className="px-4 py-3">{p.institutionName ?? '—'}</td>}
              <td className="px-4 py-3">{dict.levels[p.studyLevel]}</td>
              <td className="px-4 py-3">
                {p.publishedRoutes.length ? p.publishedRoutes.map((r) => routes[r] ?? r).join(', ') : <span className="text-[#b33a35]">{t.programmes.noRequirements}</span>}
                {p.openDrafts > 0 && <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-xs font-semibold">{format(t.programmes.openDrafts, { count: p.openDrafts })}</span>}
              </td>
              <td className="px-4 py-3">
                <span className="flex flex-wrap items-center gap-1.5">
                  <StatusChip status={p.status} t={t} />
                  {p.pendingStatus && <span className="whitespace-nowrap rounded-full bg-yellow px-2 py-0.5 text-xs font-semibold">{t.programmes.changeBadge}</span>}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex justify-end gap-2">
                  {(() => {
                    const action = rowAction(p, t.programme.act, t.institutions.open);
                    const view = `/${locale}/admin/program/${p.id}`;
                    return (
                      <>
                        <Link href={view} className="whitespace-nowrap rounded-[10px] border border-line px-3 py-1.5 text-[13px] font-semibold hover:bg-bg">
                          {t.institutions.open}
                        </Link>
                        {action.label !== t.institutions.open && (
                          <Link
                            href={action.edit ? `${view}/sunting` : view}
                            className="whitespace-nowrap rounded-[10px] bg-navy px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-navy/90"
                          >
                            {action.label}
                          </Link>
                        )}
                      </>
                    );
                  })()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
