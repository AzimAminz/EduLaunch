'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { EntryRoute, RequirementPart } from '@edulaunch/contracts';
import { discardRequirement, saveRequirement, type AdminFormState } from '@/lib/admin/actions';
import { linesFromText, type CategoryGroup } from '@/lib/admin/epanduan-text';
import { checkLines, EditorRuleTypes, gradesFor, isUnchecked, lineSummary, newLine, SectionSuggestions, subjectQualificationsFor, type EditorLine, type LineProblem } from '@/lib/admin/requirement-form';
import { describeRequirement } from '@/lib/catalogue/requirements';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert } from '@/components/auth/fields';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';
import { CategoryTabs } from './category-tabs';
import { LinesView } from './requirement-lines-view';
import { RequirementSteps } from './requirement-steps';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';

export interface EditorSubject {
  id: string;
  label: string;
  qualification: string;
  keywords: string[];
}

/** What ePanduan lists for this programme and route, grouped by categories with the same text. */
export interface EditorSource {
  groups: CategoryGroup[];
  /** The list page of each group's first category, used as the source link. */
  sourceUrls: string[];
}

interface RequirementEditorProps {
  locale: Locale;
  id: string;
  programmeId: string;
  entryRoute: EntryRoute;
  initial: { sourceUrl: string; sourceCategory: string | null; lines: EditorLine[] };
  subjects: EditorSubject[];
  epanduan?: EditorSource | null;
  /** ePanduan category (`jenprog:category`) to fill an empty draft from when it opens. */
  autoFill?: string | null;
  dict: Pick<Dictionary, 'admin' | 'requirements' | 'directory'>;
}

const isUrl = (v: string) => /^https?:\/\/\S+$/.test(v.trim());
const PARTS: RequirementPart[] = ['general', 'special'];

/**
 * The requirement editor, shaped like the official source: Syarat Am and Syarat Khas, lines under SPM / STPM / MUET
 * headings, joined by DAN or ATAU. Each line keeps the official sentence and, when it can be checked, the rule a
 * student's results are matched with. Lines can be filled from ePanduan, then edited, moved, added and removed.
 */
export function RequirementEditor({ locale, id, programmeId, entryRoute, initial, subjects, epanduan, autoFill, dict }: RequirementEditorProps) {
  const t = dict.admin.requirement;
  const m = dict.admin.institutions.import;
  const errors = dict.admin.errors;
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const validGrade = (subjectId: string, grade: string) => gradesFor(subjectById.get(subjectId)?.qualification).includes(grade);
  /** Both parts of one ePanduan group as lines, with its page as the source. */
  const fromGroup = (index: number) => {
    const group = epanduan!.groups[index]!;
    const special = group.special?.status === 'done' ? group.special.text : null;
    const first = group.categories[0];
    return {
      lines: [...linesFromText(group.general, 'general', subjects, validGrade), ...linesFromText(special, 'special', subjects, validGrade)],
      sourceUrl: epanduan!.sourceUrls[index] ?? initial.sourceUrl,
      sourceCategory: first ? `${first.jenprog}:${first.category}` : null,
    };
  };
  // Started from an ePanduan category: an empty draft opens filled from it (nothing is saved until the admin saves).
  const [start] = useState(() => {
    const index = !initial.lines.length && autoFill && epanduan ? epanduan.groups.findIndex((g) => g.categories.some((c) => `${c.jenprog}:${c.category}` === autoFill)) : -1;
    return index >= 0 ? { ...fromGroup(index), filled: true } : { ...initial, filled: false };
  });
  const [sourceUrl, setSourceUrl] = useState(start.sourceUrl);
  const [sourceCategory, setSourceCategory] = useState(start.sourceCategory);
  const [lines, setLines] = useState<EditorLine[]>(start.lines);
  const [autoFilled, setAutoFilled] = useState(start.filled);
  const [open, setOpen] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmFill, setConfirmFill] = useState<number | null>(null);
  const [sourceMissing, setSourceMissing] = useState(false);
  const [sideTab, setSideTab] = useState<'source' | 'preview'>(epanduan?.groups.length ? 'source' : 'preview');
  // 1 Syarat Am, 2 Syarat Khas, 3 check and send (step 0, the route, was chosen before the draft existed).
  const [step, setStep] = useState(1);
  const sourceRef = useRef<HTMLInputElement>(null);

  // The editing key is left out (undefined is dropped by JSON), so only real changes count.
  const snapshot = JSON.stringify({ sourceUrl, sourceCategory, lines: lines.map((l) => ({ ...l, key: undefined })) });
  // Lines filled on opening are not saved yet.
  const [savedSnapshot, setSavedSnapshot] = useState(start.filled ? '' : snapshot);
  const [sentSnapshot, setSentSnapshot] = useState(snapshot);
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(saveRequirement, {}, () => {
    setAttempted(true);
    setSentSnapshot(snapshot);
  });
  const [seenSave, setSeenSave] = useState(state.savedAt);
  if (state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    if (state.savedAt) setSavedSnapshot(sentSnapshot);
  }
  const [discardState, onDiscard, discarding] = useFormAction<AdminFormState>(discardRequirement, {});

  const allowed = subjectQualificationsFor(entryRoute);
  const subjectOptions: DropdownOption[] = useMemo(
    () => subjects.filter((s) => allowed.includes(s.qualification as never)).map((s) => ({ value: s.id, label: s.label, keywords: s.keywords })),
    [subjects, allowed],
  );

  const checked = checkLines(lines);
  const shownProblems = attempted ? checked.problems : [];
  const problemsOf = (line: EditorLine) => shownProblems.filter((p) => p.line === lines.indexOf(line)).map((p) => p.problem);

  // What students will see, from the complete lines only.
  const previewRules = checked.rules
    .filter((r) => (r.ruleType === 'min_grade' ? r.subjectId && r.minGrade : r.ruleType === 'subjects_from_list' ? r.subjectIds.length > 0 && r.minGrade : true))
    .map((r, i) => ({ ...r, id: `${i}` }));
  const preview = describeRequirement(
    { requirementId: id, programId: programmeId, entryRoute, versionNo: 1, sourceCategory, rules: previewRules },
    new Map(subjects.map((s) => [s.id, s.label])),
    dict.requirements,
  ).items;

  const dirty = snapshot !== savedSnapshot;
  const alert = !pending && state.error ? errors[state.error] : undefined;

  const update = (key: string, change: Partial<EditorLine>) => setLines((list) => list.map((l) => (l.key === key ? { ...l, ...change } : l)));
  const remove = (key: string) => setLines((list) => list.filter((l) => l.key !== key));
  const move = (key: string, by: -1 | 1) =>
    setLines((list) => {
      const line = list.find((l) => l.key === key)!;
      const same = list.filter((l) => l.part === line.part && l.section === line.section);
      const target = same[same.indexOf(line) + by];
      if (!target) return list;
      const a = list.indexOf(line);
      const b = list.indexOf(target);
      const next = [...list];
      [next[a], next[b]] = [next[b]!, next[a]!];
      return next;
    });
  /** A new line at the end of one section (the tab it was added from). */
  const add = (part: RequirementPart, section: string) => {
    const line = newLine(part, { section });
    setLines((list) => {
      const last = list.findLastIndex((l) => l.part === part && l.section === section);
      return last < 0 ? [...list, line] : [...list.slice(0, last + 1), line, ...list.slice(last + 1)];
    });
    setOpen(line.key);
  };
  const removeSection = (part: RequirementPart, section: string) => setLines((list) => list.filter((l) => l.part !== part || l.section !== section));
  /** Fills both parts from one ePanduan group (replacing what is there), with its page as the source. */
  const fill = (index: number) => {
    const next = fromGroup(index);
    setLines(next.lines);
    setSourceUrl(next.sourceUrl);
    setSourceCategory(next.sourceCategory);
    setConfirmFill(null);
    setOpen(null);
  };

  const goTo = (next: number) => {
    setStep(next);
    setOpen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const intent = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
    if (intent === 'submit') {
      // Back to the step that needs fixing: a line with a problem, else the source link (on the Syarat Am step).
      const bad = checked.problems[0];
      if (bad || !isUrl(sourceUrl)) {
        event.preventDefault();
        setAttempted(true);
        if (bad) {
          goTo(lines[bad.line]?.part === 'special' ? 2 : 1);
          return;
        }
        setSourceMissing(true);
        setStep(1);
        requestAnimationFrame(() => {
          sourceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sourceRef.current?.focus({ preventScroll: true });
        });
        return;
      }
    }
    onSubmit(event);
  };

  const categoryText = (group: CategoryGroup) => group.categories.map((c) => (m.categories as Record<string, string>)[`${c.jenprog}:${c.category}`] ?? c.category).join(' · ');

  const subjectNames = new Map(subjects.map((s) => [s.id, s.label]));
  const stepButton = (key: string, label: string, icon: 'arrowLeft' | 'arrowRight', to: number, primary = false) => (
    // Its own key, so React never reuses it for a submit button (that once sent the form on "next").
    <button key={key} type="button" onClick={() => goTo(to)} className={buttonClass(primary ? 'primary' : 'secondary')}>
      <IconText icon={icon}>{label}</IconText>
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <RequirementSteps labels={t.steps} step={step} onStep={goTo} />
      <div className={`grid items-start gap-4 ${step === 3 ? '' : 'lg:grid-cols-[minmax(0,1fr)_420px]'}`}>
        <form id="requirement-form" onSubmit={submit} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="state" value={snapshot} />
          <input type="hidden" name="programId" value={programmeId} />

          <section hidden={step !== 1} className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-lg font-semibold">{t.source.title}</h2>
                <p className="text-sm text-muted">{t.source.body}</p>
              </div>
              {epanduan && epanduan.groups.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {epanduan.groups.map((group, i) => (
                    <button key={group.key} type="button" onClick={() => (lines.length ? setConfirmFill(i) : fill(i))} className={buttonClass(lines.length ? 'secondary' : 'accent', 'sm')}>
                      <IconText icon="external">{epanduan.groups.length > 1 ? format(t.fill.fromCategory, { category: categoryText(group) }) : t.fill.button}</IconText>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {autoFilled && (
              <p role="status" className="flex items-start gap-2 rounded-[12px] bg-mint px-4 py-3 text-sm text-[#1f6b47]">
                <AdminIcon name="checkCircle" size={18} className="mt-0.5 shrink-0" />
                <span className="flex-1">{format(t.fill.autoFilled, { count: lines.length })}</span>
                <button type="button" onClick={() => setAutoFilled(false)} aria-label={dict.admin.programme.actions.cancel} className="rounded-md px-1 text-[#1f6b47] hover:bg-white/60">
                  <AdminIcon name="x" size={16} />
                </button>
              </p>
            )}
            {confirmFill !== null && (
              <div role="alertdialog" aria-label={t.fill.replaceYes} className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[#e0a800]/50 bg-cream px-4 py-3">
                <AdminIcon name="alert" size={18} />
                <p className="flex-1 text-sm">{format(t.fill.replaceConfirm, { count: lines.length })}</p>
                <button type="button" onClick={() => setConfirmFill(null)} className={buttonClass('secondary', 'sm')}>
                  {dict.admin.programme.actions.cancel}
                </button>
                <button type="button" onClick={() => fill(confirmFill)} className={buttonClass('primary', 'sm')}>
                  {t.fill.replaceYes}
                </button>
              </div>
            )}
            <label htmlFor="source-url" className="text-sm font-semibold">
              {t.source.label}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="source-url"
                ref={sourceRef}
                value={sourceUrl}
                onChange={(e) => {
                  setSourceUrl(e.target.value);
                  setSourceMissing(false);
                }}
                aria-invalid={sourceMissing || (attempted && !!sourceUrl && !isUrl(sourceUrl))}
                aria-describedby={sourceMissing ? 'source-url-error' : undefined}
                inputMode="url"
                placeholder={t.source.placeholder}
                maxLength={500}
                className={`min-w-0 flex-1 rounded-[10px] border bg-white px-4 py-3 text-[15px] outline-none focus:ring-2 ${sourceMissing || (attempted && sourceUrl && !isUrl(sourceUrl)) ? 'border-red focus:border-red focus:ring-red/15' : 'border-[#9aa3b2] focus:border-navy focus:ring-navy/15'}`}
              />
              {isUrl(sourceUrl) && (
                <a href={sourceUrl.trim()} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
                  <IconText icon="external">{t.source.open}</IconText>
                </a>
              )}
            </div>
            {sourceMissing && (
              <p id="source-url-error" className="flex items-center gap-1.5 text-[13px] text-red">
                <AdminIcon name="alert" size={14} />
                {sourceUrl.trim() ? t.source.invalid : t.source.required}
              </p>
            )}
          </section>

          {PARTS.map((part, i) => (
            <div key={part} hidden={step !== i + 1}>
              <PartEditor
                part={part}
                lines={lines.filter((l) => l.part === part)}
                open={open}
                setOpen={setOpen}
                t={t}
                noMatches={dict.directory.noMatches}
                subjectOptions={subjectOptions}
                subjectById={subjectById}
                problemsOf={problemsOf}
                onChange={update}
                onRemove={remove}
                onMove={move}
                onAdd={(section) => add(part, section)}
                onRemoveSection={(section) => removeSection(part, section)}
              />
            </div>
          ))}

          {step === 3 && (
            <section className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-5 lg:p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">{t.finish.title}</h2>
                <p className="text-sm text-muted">{t.finish.intro}</p>
              </div>
              <LinesView lines={lines} subjectNames={subjectNames} t={t} />
              <div className="flex flex-col gap-2 rounded-[12px] bg-bg/60 p-4">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted">{t.preview.title}</h3>
                {preview.length === 0 ? (
                  <p className="text-sm text-muted">{t.preview.empty}</p>
                ) : (
                  <ul className="grid gap-2 md:grid-cols-2">
                    {preview.map((item, i) => (
                      <li key={i} className="rounded-[12px] bg-white px-3.5 py-2.5">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-[13px] text-muted">{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <AdminIcon name="external" size={14} />
                {isUrl(sourceUrl) ? (
                  <a href={sourceUrl.trim()} target="_blank" rel="noreferrer" className="truncate underline hover:text-navy">
                    {sourceUrl.trim()}
                  </a>
                ) : (
                  <span className="text-red">{t.source.required}</span>
                )}
              </p>
            </section>
          )}
        </form>

        <aside hidden={step === 3} className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          {epanduan && epanduan.groups.length > 0 && (
            <div role="tablist" aria-label={t.suggest.title} className="flex gap-1 rounded-[12px] bg-white p-1">
              {(['source', 'preview'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={sideTab === tab}
                  onClick={() => setSideTab(tab)}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-sm font-semibold transition-colors duration-150 ${sideTab === tab ? 'bg-navy text-white' : 'text-navy hover:bg-bg'}`}
                >
                  <AdminIcon name={tab === 'source' ? 'external' : 'eye'} size={15} />
                  {tab === 'source' ? t.suggest.title : t.preview.title}
                </button>
              ))}
            </div>
          )}
          {epanduan && epanduan.groups.length > 0 && sideTab === 'source' && (
            <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4">
              <p className="text-[13px] text-muted">{t.suggest.intro}</p>
              <CategoryTabs groups={epanduan.groups} m={m} stacked />
            </section>
          )}
          <section hidden={!!epanduan?.groups.length && sideTab !== 'preview'} className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5">
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
        </aside>
      </div>

      <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4 lg:sticky lg:bottom-4 lg:z-10 lg:shadow-lg">
        <FormAlert>{alert ?? (shownProblems.length && !pending ? format(t.problemsSummary, { count: shownProblems.length }) : undefined)}</FormAlert>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {step > 1 && stepButton('back', t.stepBack, 'arrowLeft', step - 1)}
          <p className="flex-1 text-sm text-muted">
            {format(t.summary, { count: lines.length })}
            {dirty && <span className="ml-2 font-semibold text-navy">· {t.unsaved}</span>}
          </p>
          <Notice showKey={state.savedAt}>{t.saved}</Notice>
          <button key="save" type="submit" form="requirement-form" name="intent" value="save" disabled={pending} className={buttonClass('secondary')}>
            <IconText icon="save">{t.save}</IconText>
          </button>
          {step < 3 ? (
            stepButton('next', step === 1 ? t.stepNext.special : t.stepNext.finish, 'arrowRight', step + 1, true)
          ) : (
            <button key="submit" type="submit" form="requirement-form" name="intent" value="submit" disabled={pending} className={buttonClass('accent')}>
              <IconText icon="send" busy={pending}>
                {t.submit}
              </IconText>
            </button>
          )}
        </div>
        {step === 3 && <p className="text-[13px] text-muted">{t.submitHint}</p>}
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

type Texts = Dictionary['admin']['requirement'];

interface PartProps {
  part: RequirementPart;
  lines: EditorLine[];
  open: string | null;
  setOpen: (key: string | null) => void;
  t: Texts;
  noMatches: string;
  subjectOptions: DropdownOption[];
  subjectById: ReadonlyMap<string, EditorSubject>;
  problemsOf: (line: EditorLine) => LineProblem[];
  onChange: (key: string, change: Partial<EditorLine>) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, by: -1 | 1) => void;
  onAdd: (section: string) => void;
  onRemoveSection: (section: string) => void;
}

/**
 * One part (Syarat Am or Syarat Khas), laid out as the official page groups it: a tab per section (SPM, STPM, MUET…,
 * or "general" for lines under no heading), each with its lines joined by DAN or ATAU. Sections follow one another
 * with DAN. A line is added to the open section; sections can be added and removed.
 */
function PartEditor({ part, lines, open, setOpen, t, noMatches, subjectOptions, subjectById, problemsOf, onChange, onRemove, onMove, onAdd, onRemoveSection }: PartProps) {
  const present = [...new Set(lines.map((l) => l.section))];
  // Sections added but not given a line yet.
  const [added, setAdded] = useState<string[]>([]);
  const sections = [...present, ...added.filter((x) => !present.includes(x))];
  if (sections.length === 0) sections.push('');
  const [chosen, setChosen] = useState<string>(sections[0]!);
  const current = sections.includes(chosen) ? chosen : sections[0]!;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const own = lines.filter((l) => l.section === current);
  const label = (section: string) => section || t.sections.general;
  const addSection = (section: string) => {
    const name = section.trim().toUpperCase();
    if (!name) return;
    if (!sections.includes(name)) setAdded((list) => [...list, name]);
    setChosen(name);
    setConfirmRemove(false);
  };
  const problemCount = (section: string) => lines.filter((l) => l.section === section && problemsOf(l).length).length;

  return (
    <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5 lg:p-6">
      {/* Laid out like the official page, so what is written here reads as students and the system will see it. */}
      <div className="flex flex-col gap-1">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">{t.parts[part]}</h2>
        <p className="text-sm text-muted">{part === 'general' ? t.parts.generalHint : t.parts.specialHint}</p>
      </div>

      <div className="flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label={t.sections.label} className="flex flex-wrap gap-1.5">
          {sections.map((section) => {
            const on = section === current;
            const count = lines.filter((l) => l.section === section).length;
            const bad = problemCount(section);
            return (
              <button
                key={section || '-'}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setChosen(section);
                  setConfirmRemove(false);
                }}
                className={`inline-flex items-center gap-1.5 rounded-[9px] border px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                  on ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-bg'
                }`}
              >
                {label(section)}
                <span className={`rounded-full px-1.5 text-[11px] font-semibold normal-case ${bad ? 'bg-red text-white' : on ? 'bg-white/20' : 'bg-bg text-muted'}`}>{bad || count}</span>
              </button>
            );
          })}
        </div>
        <Dropdown
          label={t.sections.add}
          size="sm"
          value=""
          onChange={addSection}
          options={SectionSuggestions.filter((x) => !sections.includes(x)).map((x) => ({ value: x, label: x }))}
          placeholder={`+ ${t.sections.add}`}
          noMatchesLabel={noMatches}
          resetAfterChoice
          hideLabel
          className="w-full sm:w-[220px]"
        />
      </div>

      <div role="tabpanel" aria-label={label(current)} className="flex flex-col gap-2">
        {own.length === 0 && <p className="rounded-[12px] bg-bg px-4 py-3 text-sm text-muted">{lines.length ? t.sections.empty : t.parts.empty}</p>}
        {own.map((line, i) => {
          const previous = own[i - 1];
          const canOr = !!previous && !isUnchecked(line.type) && !isUnchecked(previous.type);
          const or = canOr && line.join === 'or';
          return (
            <div key={line.key} className="flex flex-col gap-2">
              {previous && (
                <div className="flex items-center gap-2 py-0.5">
                  <span className={`h-px flex-1 ${or ? 'bg-[#e0a800]/50' : 'bg-line'}`} />
                  <button
                    type="button"
                    disabled={!canOr}
                    onClick={() => onChange(line.key, { join: or ? 'and' : 'or' })}
                    title={canOr ? t.join.toggle : t.join.alone}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 disabled:cursor-default ${
                      or ? 'bg-yellow text-navy hover:bg-yellow/80' : 'bg-bg text-muted enabled:hover:bg-line'
                    }`}
                  >
                    {or ? t.join.or : t.join.and}
                  </button>
                  <span className={`h-px flex-1 ${or ? 'bg-[#e0a800]/50' : 'bg-line'}`} />
                </div>
              )}
              <LineCard
                line={line}
                first={i === 0}
                last={i === own.length - 1}
                open={open === line.key}
                onOpen={() => setOpen(open === line.key ? null : line.key)}
                t={t}
                noMatches={noMatches}
                subjectOptions={subjectOptions}
                subjectById={subjectById}
                problems={problemsOf(line)}
                onChange={(change) => onChange(line.key, change)}
                onRemove={() => onRemove(line.key)}
                onMove={(by) => onMove(line.key, by)}
              />
            </div>
          );
        })}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => onAdd(current)} className={buttonClass('secondary', 'sm')}>
            <IconText icon="plus">{format(t.sections.addLine, { section: label(current) })}</IconText>
          </button>
          {(own.length > 0 || current) &&
            (confirmRemove ? (
              <span role="alertdialog" aria-label={t.sections.remove} className="flex flex-wrap items-center gap-2 rounded-[10px] bg-red/5 px-3 py-1.5 text-[13px]">
                {format(t.sections.removeConfirm, { section: label(current), count: own.length })}
                <button type="button" onClick={() => setConfirmRemove(false)} className={buttonClass('secondary', 'sm')}>
                  {t.sections.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveSection(current);
                    setAdded((list) => list.filter((x) => x !== current));
                    setConfirmRemove(false);
                  }}
                  className={buttonClass('dangerSolid', 'sm')}
                >
                  {t.sections.yes}
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} className={`${buttonClass('ghost', 'sm')} text-[#b33a35] hover:bg-red/10`}>
                <IconText icon="trash">{format(t.sections.removeButton, { section: label(current) })}</IconText>
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}

interface LineProps {
  line: EditorLine;
  first: boolean;
  last: boolean;
  open: boolean;
  onOpen: () => void;
  t: Texts;
  noMatches: string;
  subjectOptions: DropdownOption[];
  subjectById: ReadonlyMap<string, EditorSubject>;
  problems: LineProblem[];
  onChange: (change: Partial<EditorLine>) => void;
  onRemove: () => void;
  onMove: (by: -1 | 1) => void;
}

/**
 * One line, shown as on the official page (the sentence, and what the system checks). Opened, it is written the way
 * the official text phrases it: "Gred [C] bagi matapelajaran [Bahasa Melayu]", "[2] Gred [C] dalam mana-mana
 * matapelajaran", "BAND [1.0] dalam MUET", with the official sentence kept underneath.
 */
function LineCard({ line, first, last, open, onOpen, t, noMatches, subjectOptions, subjectById, problems, onChange, onRemove, onMove }: LineProps) {
  const bad = problems.length > 0;
  const unchecked = isUnchecked(line.type);
  const p = t.phrase;
  const gradeSubject = line.type === 'min_grade' ? line.subjectId : line.subjectIds[0];
  const grades = gradesFor(gradeSubject ? subjectById.get(gradeSubject)?.qualification : undefined);
  const word = (text: string) => <span className="text-sm text-navy">{text}</span>;
  const gradeDropdown = (
    <Dropdown
      label={t.grade}
      size="sm"
      value={line.grade ?? ''}
      onChange={(grade) => onChange({ grade })}
      options={grades.map((g) => ({ value: g, label: g }))}
      placeholder={t.grade}
      noMatchesLabel={noMatches}
      searchable={false}
      invalid={problems.includes('gradeRequired')}
      hideLabel
      className="w-[96px]"
    />
  );
  const numberInput = (label: string, value: string, change: (v: string) => void, problem: LineProblem, width = 'w-20') => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => change(e.target.value)}
      inputMode="decimal"
      maxLength={6}
      aria-invalid={problems.includes(problem) || undefined}
      className={`${width} rounded-[10px] border bg-white px-3 py-2 text-center text-sm font-semibold outline-none focus:ring-2 focus:ring-navy/15 ${problems.includes(problem) ? 'border-red' : 'border-[#9aa3b2]'}`}
    />
  );
  const action = (label: string, onClick: () => void, children: React.ReactNode, { disabled = false, danger = false } = {}) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 disabled:opacity-30 ${danger ? 'text-[#b33a35] hover:bg-red/10' : 'text-navy hover:bg-bg'}`}
    >
      {children}
    </button>
  );

  return (
    <div className={`rounded-[12px] border transition-colors duration-150 ${bad ? 'border-red/60 bg-red/5' : open ? 'border-navy/40 bg-bg/60' : 'border-transparent hover:bg-bg/80'}`}>
      <div className="flex items-start gap-2 px-3 py-2.5">
        <span aria-hidden className={`mt-[7px] size-1.5 shrink-0 rounded-full ${unchecked ? 'bg-muted/50' : 'bg-navy/60'}`} />
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
          <span className="text-[13px] leading-relaxed">{line.text || <span className="text-muted">{t.line.noText}</span>}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${unchecked ? 'bg-bg text-muted' : 'bg-blue text-navy'}`}>{lineSummary(line, (id) => (id && subjectById.get(id)?.label) || '?', t)}</span>
          {bad && <span className="text-[12px] text-red">{problems.map((x) => t.problems[x]).join(' ')}</span>}
        </button>
        <span className="flex shrink-0 items-center">
          {action(open ? t.line.done : t.line.edit, onOpen, <AdminIcon name={open ? 'check' : 'pencil'} size={15} />)}
          {action(t.line.up, () => onMove(-1), <AdminIcon name="arrowLeft" size={15} className="rotate-90" />, { disabled: first })}
          {action(t.line.down, () => onMove(1), <AdminIcon name="arrowRight" size={15} className="rotate-90" />, { disabled: last })}
          {action(t.line.remove, onRemove, <AdminIcon name="trash" size={15} />, { danger: true })}
        </span>
      </div>
      {open && (
        <div className="flex flex-col gap-4 border-t border-line px-3 py-3">
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted">{t.typeLabel}</p>
            <div role="radiogroup" aria-label={t.typeLabel} className="flex flex-wrap gap-1.5">
              {EditorRuleTypes.map((x) => (
                <button
                  key={x}
                  type="button"
                  role="radio"
                  aria-checked={line.type === x}
                  onClick={() => onChange({ type: x, join: isUnchecked(x) ? 'and' : line.join })}
                  className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                    line.type === x ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-bg'
                  }`}
                >
                  {t.kinds[x]}
                </button>
              ))}
            </div>
          </div>

          {!unchecked && (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-bold uppercase tracking-wide text-muted">{p.title}</p>
              {/* Written as the official text phrases it. */}
              <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-dashed border-navy/25 bg-white px-3 py-3">
                {line.type === 'min_grade' && (
                  <>
                    {word(p.grade)}
                    {gradeDropdown}
                    {word(p.forSubject)}
                    <Dropdown
                      label={t.chooseSubject}
                      size="sm"
                      value={line.subjectId ?? ''}
                      onChange={(subjectId) => onChange({ subjectId })}
                      options={subjectOptions}
                      placeholder={t.searchSubject}
                      noMatchesLabel={noMatches}
                      invalid={problems.includes('subjectRequired')}
                      hideLabel
                      className="min-w-[220px] flex-1"
                    />
                  </>
                )}
                {line.type === 'subjects_from_list' && (
                  <>
                    {word(p.grade)}
                    {gradeDropdown}
                    {word(p.in)}
                    {numberInput(t.line.count, line.count, (count) => onChange({ count }), 'countRange', 'w-16')}
                    {word(p.subjectsFollowing)}
                  </>
                )}
                {line.type === 'min_credits' && (
                  <>
                    {numberInput(t.line.credits, line.value, (value) => onChange({ value }), 'creditsRange', 'w-16')}
                    {word(p.grade)}
                    {gradeDropdown}
                    {word(p.anySubject)}
                  </>
                )}
                {line.type === 'min_cgpa' && (
                  <>
                    {word(p.cgpa)}
                    {numberInput(t.types.min_cgpa, line.value, (value) => onChange({ value }), 'cgpaRange')}
                  </>
                )}
                {line.type === 'min_muet' && (
                  <>
                    {word(p.muetBefore)}
                    {numberInput(t.line.band, line.value, (value) => onChange({ value }), 'muetRange', 'w-16')}
                    {word(p.muetAfter)}
                  </>
                )}
              </div>
              {line.type === 'subjects_from_list' && (
                <div className="flex flex-col gap-2 pl-1">
                  {line.subjectIds.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {line.subjectIds.map((sid) => (
                        <li key={sid} className="flex items-center gap-2 text-[13px]">
                          <span aria-hidden className="text-muted">–</span>
                          <span className="flex-1">{subjectById.get(sid)?.label ?? sid}</span>
                          <button
                            type="button"
                            onClick={() => onChange({ subjectIds: line.subjectIds.filter((x) => x !== sid) })}
                            aria-label={`${t.line.remove}: ${subjectById.get(sid)?.label ?? ''}`}
                            className="rounded-md p-1 text-muted hover:bg-red/10 hover:text-[#b33a35]"
                          >
                            <AdminIcon name="x" size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Dropdown
                    label={t.line.subjects}
                    size="sm"
                    value=""
                    onChange={(subjectId) => subjectId && !line.subjectIds.includes(subjectId) && onChange({ subjectIds: [...line.subjectIds, subjectId] })}
                    options={subjectOptions.filter((o) => !line.subjectIds.includes(o.value))}
                    placeholder={t.line.addSubject}
                    noMatchesLabel={noMatches}
                    invalid={problems.includes('subjectsRequired')}
                    resetAfterChoice
                    hideLabel
                  />
                </div>
              )}
            </div>
          )}

          <label className="flex flex-col gap-1 text-[12px] font-bold uppercase tracking-wide text-muted">
            {unchecked ? t.line.textOnly : p.official}
            <textarea
              value={line.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={unchecked ? 3 : 2}
              maxLength={1500}
              placeholder={t.quotePlaceholder}
              aria-invalid={problems.includes('textRequired') || undefined}
              className={`rounded-[10px] border bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-navy outline-none focus:border-navy ${problems.includes('textRequired') ? 'border-red' : 'border-line'}`}
            />
          </label>
        </div>
      )}
    </div>
  );
}
