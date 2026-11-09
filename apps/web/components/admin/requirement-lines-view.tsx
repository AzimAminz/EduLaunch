import type { RequirementPart } from '@edulaunch/contracts';
import type { AdminRule } from '@/lib/admin/api';
import { isUnchecked, lineSummary, linesFromRules, type EditorLine } from '@/lib/admin/requirement-form';
import type { Dictionary } from '@/lib/i18n/locale';

const PARTS: RequirementPart[] = ['general', 'special'];

/**
 * Stored requirement lines, read only, in the same layout as the ePanduan reference: Syarat Am and Syarat Khas,
 * lines under their SPM / STPM / MUET headings, DAN / ATAU between them, and what each line checks.
 */
export function RequirementLinesView({ rules, subjectNames, t }: { rules: AdminRule[]; subjectNames: ReadonlyMap<string, string>; t: Dictionary['admin']['requirement'] }) {
  return <LinesView lines={linesFromRules(rules)} subjectNames={subjectNames} t={t} />;
}

/** The same view for lines being edited (the editor's last step). */
export function LinesView({ lines, subjectNames, t }: { lines: EditorLine[]; subjectNames: ReadonlyMap<string, string>; t: Dictionary['admin']['requirement'] }) {
  const name = (id: string | null) => (id && subjectNames.get(id)) || '?';
  return (
    <div className="grid items-start gap-3 xl:grid-cols-2">
      {PARTS.map((part) => {
        const own = lines.filter((l) => l.part === part);
        return (
          <section key={part} className="flex flex-col gap-1.5 rounded-[8px] border border-line bg-white p-3">
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-muted">{t.parts[part]}</h4>
            {own.length === 0 && <p className="text-[13px] text-muted">{t.parts.none}</p>}
            {own.map((line, i) => {
              const previous = own[i - 1];
              const or = !!previous && line.join === 'or' && !isUnchecked(line.type) && !isUnchecked(previous.type);
              return (
                <div key={line.key} className="flex flex-col gap-1.5">
                  {previous && (
                    <div role="separator" className="flex items-center gap-2 py-0.5">
                      <span className={`h-px flex-1 ${or ? 'bg-[#e0a800]/50' : 'bg-line'}`} />
                      <span className={`rounded-full px-2 text-[11px] font-bold ${or ? 'bg-yellow text-navy' : 'bg-bg text-muted'}`}>{or ? t.join.or : t.join.and}</span>
                      <span className={`h-px flex-1 ${or ? 'bg-[#e0a800]/50' : 'bg-line'}`} />
                    </div>
                  )}
                  {line.section && line.section !== previous?.section && (
                    <p className="mt-1 self-start rounded-md bg-navy/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">{line.section}</p>
                  )}
                  <div className="flex items-start gap-2 rounded-[8px] px-2 py-1.5">
                    <span aria-hidden className={`mt-[7px] size-1.5 shrink-0 rounded-full ${isUnchecked(line.type) ? 'bg-muted/50' : 'bg-navy/60'}`} />
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <p className="text-[13px] leading-relaxed">{line.text.replace('[Contoh]', '').trim()}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isUnchecked(line.type) ? 'bg-bg text-muted' : 'bg-blue text-navy'}`}>{lineSummary(line, name, t)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
