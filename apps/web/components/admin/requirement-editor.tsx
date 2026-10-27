'use client';

import { useMemo, useState } from 'react';
import type { EntryRoute } from '@edulaunch/contracts';
import { discardRequirement, saveRequirement, type AdminFormState } from '@/lib/admin/actions';
import { checkGroups, EditorRuleTypes, gradesFor, newRule, subjectQualificationsFor, type EditorGroup, type EditorRule, type RuleProblem } from '@/lib/admin/requirement-form';
import { describeRequirement } from '@/lib/catalogue/requirements';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert } from '@/components/auth/fields';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';

export interface EditorSubject {
  id: string;
  label: string;
  qualification: string;
  keywords: string[];
}

interface RequirementEditorProps {
  locale: Locale;
  id: string;
  programmeId: string;
  entryRoute: EntryRoute;
  initial: { sourceUrl: string; groups: EditorGroup[] };
  subjects: EditorSubject[];
  dict: Pick<Dictionary, 'admin' | 'requirements' | 'directory'>;
}

const isUrl = (v: string) => /^https?:\/\/\S+$/.test(v.trim());

/**
 * The requirement wizard (Figma B2): show the source, write each requirement as a sentence chosen from lists,
 * see what students will see, then save or send for review. Lines with several options mean "at least one of".
 */
export function RequirementEditor({ locale, id, programmeId, entryRoute, initial, subjects, dict }: RequirementEditorProps) {
  const t = dict.admin.requirement;
  const errors = dict.admin.errors;
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [groups, setGroups] = useState<EditorGroup[]>(initial.groups.length ? initial.groups : [{ quote: '', rules: [newRule()] }]);
  const [attempted, setAttempted] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const snapshot = JSON.stringify({ sourceUrl, groups });
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify({ sourceUrl: initial.sourceUrl, groups: initial.groups }));
  const [sentSnapshot, setSentSnapshot] = useState(snapshot);
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(saveRequirement, {}, () => {
    setAttempted(true);
    setSentSnapshot(snapshot);
  });
  // After a successful save, what was sent is what is stored.
  const [seenSave, setSeenSave] = useState(state.savedAt);
  if (state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    if (state.savedAt) setSavedSnapshot(sentSnapshot);
  }
  const [discardState, onDiscard, discarding] = useFormAction<AdminFormState>(discardRequirement, {});

  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const allowedQualifications = subjectQualificationsFor(entryRoute);
  const subjectOptions: DropdownOption[] = useMemo(
    () => subjects.filter((s) => allowedQualifications.includes(s.qualification as never)).map((s) => ({ value: s.id, label: s.label, keywords: s.keywords })),
    [subjects, allowedQualifications],
  );

  const { problems } = checkGroups(groups);
  const shownProblems = attempted ? problems : [];
  const problemAt = (group: number, rule: number): RuleProblem[] => shownProblems.filter((p) => p.group === group && p.rule === rule).map((p) => p.problem);

  const update = (gi: number, change: (g: EditorGroup) => EditorGroup) => setGroups((list) => list.map((g, i) => (i === gi ? change(g) : g)));
  const updateRule = (gi: number, ri: number, change: Partial<EditorRule>) =>
    update(gi, (g) => ({ ...g, rules: g.rules.map((r, i) => (i === ri ? { ...r, ...change } : r)) }));

  // What students will see, built from the lines as they are now (incomplete rules left out).
  const preview = useMemo(() => {
    const names = new Map(subjects.map((s) => [s.id, s.label]));
    const rules = groups.flatMap((g, gi) =>
      g.rules
        .filter((r) => (r.type === 'min_grade' ? r.subjectId && r.grade : r.value.trim()))
        .map((r, ri) => ({
          id: `${gi}-${ri}`,
          groupNo: gi + 1,
          ruleType: r.type,
          subjectId: r.type === 'min_grade' ? r.subjectId : null,
          minGrade: r.grade,
          minValue: r.type === 'min_grade' ? null : Number(r.value.replace(',', '.')),
          evidenceQuote: g.quote,
        })),
    );
    return describeRequirement({ requirementId: id, programId: programmeId, entryRoute, versionNo: 1, rules }, names, dict.requirements).items;
  }, [groups, subjects, id, programmeId, entryRoute, dict.requirements]);

  const dirty = snapshot !== savedSnapshot;
  const sourceDone = isUrl(sourceUrl);
  const rulesDone = groups.length > 0 && problems.length === 0;
  const steps = [true, sourceDone, rulesDone, false];
  const alert = !pending && state.error ? errors[state.error] : undefined;

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] border border-line bg-white px-5 py-4">
        {t.steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2 text-sm font-semibold">
            <span className={`flex size-7 items-center justify-center rounded-full text-xs ${steps[i] ? 'bg-[#1f6b47] text-white' : i === 2 || (i === 1 && !sourceDone) ? 'bg-yellow' : 'bg-bg'}`}>
              {steps[i] ? '✓' : i + 1}
            </span>
            <span className={steps[i] ? '' : 'text-muted'}>{label}</span>
            {i < t.steps.length - 1 && <span aria-hidden className="mx-1 hidden h-px w-8 bg-line sm:block" />}
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form id="requirement-form" onSubmit={onSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="state" value={snapshot} />
          <input type="hidden" name="programId" value={programmeId} />

          <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5 lg:p-6">
            <h2 className="text-lg font-semibold">{t.source.title}</h2>
            <p className="text-sm text-muted">{t.source.body}</p>
            <label htmlFor="source-url" className="text-sm font-semibold">
              {t.source.label}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="source-url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                inputMode="url"
                placeholder={t.source.placeholder}
                maxLength={500}
                className={`min-w-0 flex-1 rounded-[10px] border bg-white px-4 py-3 text-[15px] outline-none focus:border-navy focus:ring-2 focus:ring-navy/15 ${attempted && sourceUrl && !sourceDone ? 'border-red' : 'border-[#9aa3b2]'}`}
              />
              {sourceDone && (
                <a href={sourceUrl.trim()} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
                  <IconText icon="external">{t.source.open}</IconText>
                </a>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5 lg:p-6">
            <h2 className="text-lg font-semibold">{t.write.title}</h2>
            <p className="text-sm text-muted">{t.write.body}</p>

            {groups.map((group, gi) => {
              const quoteProblem = problemAt(gi, -1).length > 0;
              return (
                <fieldset key={gi} className={`flex flex-col gap-3 rounded-[14px] border p-4 ${shownProblems.some((p) => p.group === gi) ? 'border-red/60 bg-red/5' : 'border-line bg-bg/60'}`}>
                  <legend className="sr-only">{`${t.write.title} ${gi + 1}`}</legend>
                  {group.rules.length > 1 && <p className="text-sm font-semibold">{t.sentence.oneOf}</p>}
                  {group.rules.map((rule, ri) => (
                    <div key={ri} className="flex flex-col gap-2">
                      {ri > 0 && <p className="text-[13px] font-semibold uppercase text-muted">{t.sentence.or}</p>}
                      <RuleRow
                        rule={rule}
                        t={t}
                        noMatches={dict.directory.noMatches}
                        subjectOptions={subjectOptions}
                        grades={gradesFor(rule.subjectId ? subjectById.get(rule.subjectId)?.qualification : undefined)}
                        problems={problemAt(gi, ri)}
                        onChange={(change) => updateRule(gi, ri, change)}
                        onRemove={group.rules.length > 1 ? () => update(gi, (g) => ({ ...g, rules: g.rules.filter((_, i) => i !== ri) })) : undefined}
                        subjectQualification={(sid) => subjectById.get(sid)?.qualification}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => update(gi, (g) => ({ ...g, rules: [...g.rules, { ...newRule(g.rules.at(-1)?.type), grade: g.rules.at(-1)?.grade ?? null }] }))}
                    className="self-start text-sm font-semibold text-[#2f5bd3] hover:underline"
                  >
                    {t.addAlternative}
                  </button>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold">{t.quote}</span>
                    <textarea
                      value={group.quote}
                      onChange={(e) => update(gi, (g) => ({ ...g, quote: e.target.value }))}
                      rows={2}
                      maxLength={1000}
                      placeholder={t.quotePlaceholder}
                      aria-invalid={quoteProblem || undefined}
                      className={`rounded-[10px] border bg-white px-3 py-2 text-sm italic outline-none focus:border-navy ${quoteProblem ? 'border-red' : 'border-line'}`}
                    />
                    {quoteProblem && <span className="text-[13px] text-red">{t.problems.quoteRequired}</span>}
                  </label>
                  <button type="button" onClick={() => setGroups((list) => list.filter((_, i) => i !== gi))} className="self-end text-[13px] font-semibold text-[#b33a35] hover:underline">
                    {t.removeLine}
                  </button>
                </fieldset>
              );
            })}

            <button type="button" onClick={() => setGroups((list) => [...list, { quote: '', rules: [newRule()] }])} className={`${buttonClass('secondary')} self-start`}>
              <IconText icon="plus">{t.addRule}</IconText>
            </button>
          </section>
        </form>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5">
            <h2 className="font-semibold">{t.preview.title}</h2>
            <p className="text-[13px] text-muted">{t.preview.body}</p>
            {preview.length === 0 ? (
              <p className="text-sm text-muted">{t.preview.empty}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {preview.map((item, i) => (
                  <li key={i} className="rounded-[12px] bg-bg px-3.5 py-2.5">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-[13px] text-muted">{item.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="flex flex-col gap-2 rounded-[18px] bg-cream p-5">
            <h2 className="font-semibold">{t.why.title}</h2>
            <p className="text-sm">{t.why.body}</p>
          </section>
        </aside>
      </div>

      <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4 lg:sticky lg:bottom-4 lg:z-10 lg:shadow-lg">
        <FormAlert>{alert ?? (shownProblems.length && !pending ? format(t.problemsSummary, { count: shownProblems.length }) : undefined)}</FormAlert>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-muted">
            {format(t.summary, { count: groups.length })}
            {dirty && <span className="ml-2 font-semibold text-navy">· {t.unsaved}</span>}
          </p>
          <Notice showKey={state.savedAt}>{t.saved}</Notice>
          <button type="submit" form="requirement-form" name="intent" value="save" disabled={pending} className={buttonClass('secondary')}>
            <IconText icon="save">{t.save}</IconText>
          </button>
          <button type="submit" form="requirement-form" name="intent" value="submit" disabled={pending} className={buttonClass('accent')}>
            <IconText icon="send" busy={pending}>
              {t.submit}
            </IconText>
          </button>
        </div>
        <p className="text-[13px] text-muted">{t.submitHint}</p>
        <form onSubmit={onDiscard} className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="programId" value={programmeId} />
          {!discarding && discardState.error && <p className="text-[13px] text-red">{errors[discardState.error]}</p>}
          {confirmDiscard ? (
            <>
              <AdminIcon name="alert" size={18} className="text-[#b33a35]" />
              <span className="text-sm">{t.discardConfirm}</span>
              <button type="submit" disabled={discarding} className={buttonClass('dangerSolid', 'sm')}>
                <IconText icon="trash" busy={discarding}>
                  {t.discardYes}
                </IconText>
              </button>
              <button type="button" onClick={() => setConfirmDiscard(false)} className={buttonClass('secondary', 'sm')}>
                {dict.admin.programme.actions.cancel}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDiscard(true)} className={`${buttonClass('ghost', 'sm')} text-[#b33a35] hover:bg-red/10`}>
              <IconText icon="trash">{t.discard}</IconText>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

interface RuleRowProps {
  rule: EditorRule;
  t: Dictionary['admin']['requirement'];
  noMatches: string;
  subjectOptions: DropdownOption[];
  grades: readonly string[];
  problems: RuleProblem[];
  onChange: (change: Partial<EditorRule>) => void;
  onRemove?: () => void;
  subjectQualification: (subjectId: string) => string | undefined;
}

/** One requirement written as a sentence: "Students need at least [B] in [Mathematics]". */
function RuleRow({ rule, t, noMatches, subjectOptions, grades, problems, onChange, onRemove, subjectQualification }: RuleRowProps) {
  const s = t.sentence;
  const has = (p: RuleProblem) => problems.includes(p);
  const number = (label: string, problem: RuleProblem, width = 'w-20') => (
    <input
      aria-label={label}
      value={rule.value}
      onChange={(e) => onChange({ value: e.target.value })}
      inputMode="decimal"
      maxLength={6}
      aria-invalid={has(problem) || undefined}
      className={`${width} rounded-xl border-[1.5px] bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-yellow ${has(problem) ? 'border-red' : 'border-line'}`}
    />
  );
  const gradeDropdown = (label: string) => (
    <Dropdown
      label={label}
      hideLabel
      size="sm"
      value={rule.grade ?? ''}
      onChange={(grade) => onChange({ grade })}
      options={grades.map((g) => ({ value: g, label: g }))}
      placeholder={t.grade}
      noMatchesLabel={noMatches}
      searchable={false}
      invalid={has('gradeRequired')}
      className="w-[92px]"
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2 text-[15px]">
        <span>{s.needs}</span>
        <Dropdown
          label={t.typeLabel}
          hideLabel
          size="sm"
          value={rule.type}
          onChange={(type) => onChange({ ...newRule(type as EditorRule['type']) })}
          options={EditorRuleTypes.map((x) => ({ value: x, label: t.types[x] }))}
          placeholder={t.typeLabel}
          noMatchesLabel={noMatches}
          searchable={false}
          className="w-[170px]"
        />
        {rule.type === 'min_grade' && (
          <>
            <span>{s.minimum}</span>
            {gradeDropdown(t.grade)}
            <span>{s.in}</span>
            <Dropdown
              label={t.chooseSubject}
              hideLabel
              size="sm"
              value={rule.subjectId ?? ''}
              onChange={(subjectId) => {
                // A grade from another exam's scale (e.g. SPM A+ on an STPM subject) is cleared.
                const keep = rule.grade && gradesFor(subjectQualification(subjectId)).includes(rule.grade);
                onChange({ subjectId, grade: keep ? rule.grade : null });
              }}
              options={subjectOptions}
              placeholder={t.searchSubject}
              noMatchesLabel={noMatches}
              invalid={has('subjectRequired')}
              className="min-w-[200px] flex-1"
            />
          </>
        )}
        {rule.type === 'min_credits' && (
          <>
            <span>{s.creditsGrade}</span>
            {gradeDropdown(t.grade)}
            <span>{s.creditsOrBetter}</span>
            {number(t.value, 'creditsRange', 'w-16')}
            <span>{s.subjects}</span>
          </>
        )}
        {rule.type === 'min_cgpa' && (
          <>
            <span>{s.cgpa}</span>
            {number(t.value, 'cgpaRange')}
          </>
        )}
        {rule.type === 'min_muet' && (
          <>
            <span>{s.muet}</span>
            {number(t.value, 'muetRange', 'w-16')}
          </>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={t.removeAlternative} title={t.removeAlternative} className="ml-auto rounded-full px-2 py-1 text-lg leading-none hover:bg-white">
            ×
          </button>
        )}
      </div>
      {problems.length > 0 && <p className="text-[13px] text-red">{problems.map((p) => t.problems[p]).join(' ')}</p>}
    </div>
  );
}
