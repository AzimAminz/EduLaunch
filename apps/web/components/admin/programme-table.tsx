import Link from 'next/link';
import type { ProgrammeRow } from '@/lib/admin/api';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { StatusChip } from './ui';

/** Programmes as a table: name (opens it), institution, level, published routes and open drafts, status. */
export function ProgrammeTable({ rows, locale, dict, showInstitution = true }: { rows: ProgrammeRow[]; locale: Locale; dict: Dictionary; showInstitution?: boolean }) {
  const t = dict.admin;
  const routes: Record<string, string> = dict.requirements.routes;
  if (rows.length === 0) return <p className="rounded-[14px] border border-line bg-white px-5 py-4 text-sm text-muted">{t.programmes.empty}</p>;
  return (
    <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-bg text-[13px] text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">{t.programmes.columns.programme}</th>
            {showInstitution && <th className="px-4 py-3 font-medium">{t.programmes.columns.institution}</th>}
            <th className="px-4 py-3 font-medium">{t.programmes.columns.level}</th>
            <th className="px-4 py-3 font-medium">{t.programmes.columns.requirements}</th>
            <th className="px-4 py-3 font-medium">{t.programmes.columns.status}</th>
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
                <StatusChip status={p.status} t={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
