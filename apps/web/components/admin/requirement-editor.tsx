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
      const same = list.filter((l) => l.part === line.part);
      const target = same[same.indexOf(line) + by];
      if (!target) return list;
      const a = list.indexOf(line);
      const b = list.indexOf(target);
      const next = [...list];
      [next[a], next[b]] = [next[b]!, next[a]!];
      return next;
    });
  const add = (part: RequirementPart) => {
    const last = [...lines].reverse().find((l) => l.part === part);
    const line = newLine(part, { section: last?.section ?? '' });
    setLines((list) => [...list, line]);
    setOpen(line.key);
  };
  /** Fills both parts from one ePanduan group (replacing what is there), with its page as the source. */
  const fill = (index: number) => {
    const next = fromGroup(index);
    setLines(next.lines);
    setSourceUrl(next.sourceUrl);
    setSourceCategory(next.sourceCategory);
    setConfirmFill(null);
    setOpen(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    const intent = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
    if (intent === 'submit' && !isUrl(sourceUrl)) {
      event.preventDefault();
      setAttempted(true);
      setSourceMissing(true);
      sourceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sourceRef.current?.focus({ preventScroll: true });
      return;
    }
    onSubmit(event);
  };

  const categoryText = (group: CategoryGroup) => group.categories.map((c) => (m.categories as Record<string, string>)[`${c.jenprog}:${c.category}`] ?? c.category).join(' · ');

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <form id="requirement-form" onSubmit={submit} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="state" value={snapshot} />
          <input type="hidden" name="programId" value={programmeId} />

          <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5 lg:p-6">
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

          {PARTS.map((part) => (
            <PartEditor
              key={part}
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
              onAdd={() => add(part)}
            />
          ))}
        </form>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
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
          <p className="flex-1 text-sm text-muted">
            {format(t.summary, { count: lines.length })}
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
  onAdd: () => void;
}

/** One part (Syarat Am or Syarat Khas): its lines under their headings, with DAN / ATAU between them. */
function PartEditor({ part, lines, open, setOpen, t, noMatches, subjectOptions, subjectById, problemsOf, onChange, onRemove, onMove, onAdd }: PartProps) {
  return (
    <section className="flex flex-col gap-2 rounded-[18px] border border-line bg-white p-5 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t.parts[part]}</h2>
        <p className="text-sm text-muted">{part === 'general' ? t.parts.generalHint : t.parts.specialHint}</p>
      </div>
      {lines.length === 0 && <p className="rounded-[12px] bg-bg px-4 py-3 text-sm text-muted">{t.parts.empty}</p>}
      {lines.map((line, i) => {
        const previous = lines[i - 1];
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
            {line.section && line.section !== previous?.section && (
              <p className="self-start rounded-md bg-navy/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">{line.section}</p>
            )}
            <LineCard
              line={line}
              first={i === 0}
              last={i === lines.length - 1}
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
      <button type="button" onClick={onAdd} className={`${buttonClass('secondary', 'sm')} mt-1 self-start`}>
        <IconText icon="plus">{t.line.add}</IconText>
      </button>
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

/** One line: the official sentence and what it checks; opens to edit its kind, values, heading and sentence. */
function LineCard({ line, first, last, open, onOpen, t, noMatches, subjectOptions, subjectById, problems, onChange, onRemove, onMove }: LineProps) {
  const bad = problems.length > 0;
  const unchecked = isUnchecked(line.type);
  const gradeSubject = line.type === 'min_grade' ? line.subjectId : line.subjectIds[0];
  const grades = gradesFor(gradeSubject ? subjectById.get(gradeSubject)?.qualification : undefined);
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
      className="w-[110px]"
    />
  );
  const numberInput = (label: string, value: string, change: (v: string) => void, problem: LineProblem) => (
    <label className="flex flex-col gap-1 text-[13px] font-semibold">
      {label}
      <input
        value={value}
        onChange={(e) => change(e.target.value)}
        inputMode="decimal"
        maxLength={6}
        aria-invalid={problems.includes(problem) || undefined}
        className={`w-24 rounded-[10px] border bg-white px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-navy/15 ${problems.includes(problem) ? 'border-red' : 'border-line'}`}
      />
    </label>
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
    <div className={`rounded-[12px] border transition-colors duration-150 ${bad ? 'border-red/60 bg-red/5' : open ? 'border-navy/40 bg-bg/60' : 'border-line bg-white hover:border-navy/25'}`}>
      <div className="flex items-start gap-2 px-3 py-2.5">
        <span aria-hidden className={`mt-[7px] size-1.5 shrink-0 rounded-full ${unchecked ? 'bg-muted/50' : 'bg-navy/60'}`} />
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
          <span className="text-[13px] leading-relaxed">{line.text || <span className="text-muted">{t.line.noText}</span>}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${unchecked ? 'bg-bg text-muted' : 'bg-blue text-navy'}`}>{lineSummary(line, (id) => (id && subjectById.get(id)?.label) || '?', t)}</span>
          {bad && <span className="text-[12px] text-red">{problems.map((p) => t.problems[p]).join(' ')}</span>}
        </button>
        <span className="flex shrink-0 items-center">
          {action(open ? t.line.done : t.line.edit, onOpen, <AdminIcon name={open ? 'check' : 'pencil'} size={15} />)}
          {action(t.line.up, () => onMove(-1), <AdminIcon name="arrowLeft" size={15} className="rotate-90" />, { disabled: first })}
          {action(t.line.down, () => onMove(1), <AdminIcon name="arrowRight" size={15} className="rotate-90" />, { disabled: last })}
          {action(t.line.remove, onRemove, <AdminIcon name="trash" size={15} />, { danger: true })}
        </span>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <Dropdown
              label={t.typeLabel}
              size="sm"
              value={line.type}
              onChange={(type) => onChange({ type: type as EditorLine['type'], join: isUnchecked(type as EditorLine['type']) ? 'and' : line.join })}
              options={EditorRuleTypes.map((x) => ({ value: x, label: t.kinds[x] }))}
              placeholder={t.typeLabel}
              noMatchesLabel={noMatches}
              searchable={false}
              className="w-[230px]"
            />
            {line.type === 'min_grade' && (
              <>
                {gradeDropdown}
                <Dropdown
                  label={t.chooseSubject}
                  size="sm"
                  value={line.subjectId ?? ''}
                  onChange={(subjectId) => onChange({ subjectId })}
                  options={subjectOptions}
                  placeholder={t.searchSubject}
                  noMatchesLabel={noMatches}
                  invalid={problems.includes('subjectRequired')}
                  className="min-w-[220px] flex-1"
                />
              </>
            )}
            {line.type === 'subjects_from_list' && (
              <>
                {gradeDropdown}
                {numberInput(t.line.count, line.count, (count) => onChange({ count }), 'countRange')}
              </>
            )}
            {line.type === 'min_credits' && (
              <>
                {gradeDropdown}
                {numberInput(t.line.credits, line.value, (value) => onChange({ value }), 'creditsRange')}
              </>
            )}
            {line.type === 'min_cgpa' && numberInput(t.types.min_cgpa, line.value, (value) => onChange({ value }), 'cgpaRange')}
            {line.type === 'min_muet' && numberInput(t.line.band, line.value, (value) => onChange({ value }), 'muetRange')}
          </div>
          {line.type === 'subjects_from_list' && (
            <div className="flex flex-col gap-2">
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
              />
              {line.subjectIds.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {line.subjectIds.map((sid) => (
                    <li key={sid} className="flex items-center gap-1 rounded-full border border-line bg-white py-0.5 pl-2.5 pr-1 text-[12px]">
                      {subjectById.get(sid)?.label ?? sid}
                      <button
                        type="button"
                        onClick={() => onChange({ subjectIds: line.subjectIds.filter((x) => x !== sid) })}
                        aria-label={`${t.line.remove}: ${subjectById.get(sid)?.label ?? ''}`}
                        className="rounded-full px-1 hover:bg-bg"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            {t.line.section}
            <input
              value={line.section}
              onChange={(e) => onChange({ section: e.target.value.toUpperCase() })}
              list="requirement-sections"
              maxLength={60}
              placeholder={t.line.sectionPlaceholder}
              className="rounded-[10px] border border-line bg-white px-3 py-2 text-sm font-normal outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
            />
            <datalist id="requirement-sections">
              {SectionSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">
            {unchecked ? t.line.textOnly : t.line.text}
            <textarea
              value={line.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={2}
              maxLength={1500}
              placeholder={t.quotePlaceholder}
              aria-invalid={problems.includes('textRequired') || undefined}
              className={`rounded-[10px] border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-navy ${problems.includes('textRequired') ? 'border-red' : 'border-line'}`}
            />
          </label>
        </div>
      )}
    </div>
  );
}
