import Link from 'next/link';
import type { EligibilityAnswer } from '@/lib/recommendation/api';
import { explainRule } from '@/lib/eligibility/explain';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';

interface EligibilityResultProps {
  locale: Locale;
  answer: EligibilityAnswer;
  subjectNames: ReadonlyMap<string, string>;
  t: Dictionary['eligibility'];
  routeNames: Record<string, string>;
}

const STATUS_STYLE = {
  eligible: 'bg-mint text-navy',
  almost: 'bg-cream text-navy',
  not_yet: 'bg-red/10 text-navy',
} as const;

/**
 * "Can I get in?" on the programme page (Figma: Portal / User eligibility). The outcome for the student's
 * entry route, then each requirement with what they have: ✓ met, ✗ not met. Either/or groups are listed together.
 */
export function EligibilityResult({ locale, answer, subjectNames, t, routeNames }: EligibilityResultProps) {
  const routeName = (route: string) => routeNames[route] ?? route;
  const resultsLink = (label: string, query = '') => (
    <Link href={`/${locale}/dokumen${query}`} className="self-start rounded-[10px] bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90">
      {label}
    </Link>
  );

  return (
    <section data-reveal aria-labelledby="eligibility-title" className="flex flex-col gap-4 rounded-[22px] bg-white p-6">
      <h2 id="eligibility-title" className="text-[22px] font-semibold leading-tight">
        {t.title}
      </h2>

      {answer.state === 'no_requirement' && <p className="text-sm text-muted">{t.noRequirement}</p>}
      {answer.state === 'no_route' && <p className="text-sm text-muted">{format(t.noRoute, { routes: answer.routes.map(routeName).join(', ') })}</p>}
      {answer.state === 'no_results' && (
        <>
          <p className="text-sm text-muted">{format(answer.missing === 'cgpa' ? t.noCgpa : t.noGrades, { route: routeName(answer.entryRoute) })}</p>
          {resultsLink(t.fillResults, answer.missing === 'grades' ? '?bahagian=spm' : '')}
        </>
      )}

      {answer.state === 'checked' && (
        <>
          <div className={`flex flex-col gap-1 rounded-[14px] px-4 py-3 ${STATUS_STYLE[answer.status]}`}>
            <p className="text-lg font-semibold">{t.status[answer.status]}</p>
            <p className="text-sm">{format(t.statusBody[answer.status], { route: routeName(answer.entryRoute) })}</p>
            {answer.isTargetBased && <p className="text-[13px] font-medium">{t.targetNote}</p>}
          </div>
          {/* A plain list split by thin rules: one line per requirement, no box around each. */}
          <ul className="flex flex-col divide-y divide-line">
            {/* Syarat Am and Syarat Khas often both ask for the CGPA or MUET: an identical line is listed once. */}
            {answer.groups
              .filter((group, i, all) => {
                const key = (g: typeof group) => `${g.passed}|${g.rules.map((r) => explainRule(r, subjectNames, t)).join('|')}`;
                return all.findIndex((other) => key(other) === key(group)) === i;
              })
              .map((group, i) => (
              <li key={i} className="flex gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                <span aria-hidden className={`mt-0.5 font-bold ${group.passed ? 'text-[#2e7d57]' : 'text-red'}`}>
                  {group.passed ? '✓' : '✗'}
                </span>
                <span className="sr-only">{group.passed ? '✓' : '✗'}</span>
                {group.rules.length === 1 ? (
                  <span>{explainRule(group.rules[0]!, subjectNames, t)}</span>
                ) : (
                  <span className="flex flex-col gap-1">
                    <span className="font-medium">{t.oneOf}</span>
                    {group.rules.map((rule, j) => (
                      <span key={j} className={rule.passed ? '' : 'text-muted'}>
                        {rule.passed ? '✓ ' : '· '}
                        {explainRule(rule, subjectNames, t)}
                      </span>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {answer.toConfirm.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-[12px] border border-[#e0a800]/50 bg-cream px-4 py-3 text-sm">
              <p className="font-semibold">{t.toConfirm}</p>
              <ul className="flex flex-col gap-1">
                {answer.toConfirm.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden>•</span>
                    <span>{item.replace('[Contoh]', '').trim()}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-muted">{t.toConfirmNote}</p>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted">{t.disclaimer}</p>
    </section>
  );
}
