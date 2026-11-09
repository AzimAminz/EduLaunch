import type { ReactNode } from 'react';
import type { PendingDetails } from '@/lib/admin/api';
import { changedFields } from '@/lib/admin/programme-workflow';
import { averageGroup } from '@/lib/merit/compare';
import { format, type Dictionary } from '@/lib/i18n/locale';

/** Names for the IDs and codes a programme stores, so the page shows words. */
export interface DetailNames {
  institutions: ReadonlyMap<string, string>;
  fields: ReadonlyMap<string, string>;
  nec: ReadonlyMap<string, string>;
}

type Show = Partial<Record<keyof PendingDetails, (value: PendingDetails[keyof PendingDetails]) => string>>;

/** Turns each stored value into the words an admin reads, shared by the details view and the change table. */
function shows(dict: Dictionary, names: DetailNames): Show {
  const v = dict.admin.programme.values;
  const text = (x: unknown) => (x === null || x === undefined || x === '' ? v.none : String(x));
  const yesNo = (x: unknown) => (x ? v.yes : v.no);
  return {
    institutionId: (x) => (x ? (names.institutions.get(String(x)) ?? v.none) : v.none),
    studyLevel: (x) => dict.levels[x as keyof Dictionary['levels']] ?? text(x),
    name: text,
    programCode: text,
    internalCode: text,
    faculty: text,
    necCode: (x) => (x ? `${x} · ${names.nec.get(String(x)) ?? ''}` : v.none),
    durationSemesters: (x) => (typeof x === 'number' ? format(v.duration, { n: x, years: x / 2 }) : v.none),
    studyMode: (x) => (x ? dict.admin.programmeForm.studyModes[x as keyof Dictionary['admin']['programmeForm']['studyModes']] : v.none),
    campuses: (x) => ((x as string[] | undefined)?.length ? (x as string[]).join('; ') : v.none),
    fieldIds: (x) => ((x as string[]).length ? (x as string[]).map((id) => names.fields.get(id) ?? id).join(', ') : v.none),
    hasInterview: yesNo,
    bumiputeraOnly: yesNo,
    isStem: yesNo,
    isTvet: yesNo,
    jointDegree: yesNo,
    feeder: yesNo,
    careers: (x) => ((x as string[] | undefined)?.length ? (x as string[]).join(', ') : v.none),
    fees: text,
    note: text,
    sourceUrl: text,
  };
}

/** The label of each field, as on the form. */
function labels(dict: Dictionary): Record<keyof PendingDetails, string> {
  const f = dict.admin.programmeForm;
  return {
    institutionId: f.institution,
    studyLevel: f.level,
    name: f.name,
    programCode: f.programCode,
    internalCode: f.internalCode,
    faculty: f.faculty,
    necCode: f.nec,
    durationSemesters: f.duration,
    studyMode: f.studyMode,
    campuses: f.campuses,
    fieldIds: f.fields,
    hasInterview: f.interview,
    bumiputeraOnly: f.bumiputera,
    isStem: f.stem,
    isTvet: f.tvet,
    jointDegree: f.jointDegree,
    feeder: f.feeder,
    careers: f.careers,
    fees: f.fees,
    note: f.note,
    sourceUrl: f.sourceUrl,
  };
}

/** The programme's details, read only, in the same groups as the form. */
/** The programme's admission facts from ePanduan: its entry routes and its newest average merit. */
export interface AdmissionFacts {
  entryRoutes: string[];
  averageMerit: { intakeYear: number; value: number } | null;
}

export function ProgrammeDetails({ details, dict, names, admission }: { details: PendingDetails; dict: Dictionary; names: DetailNames; admission?: AdmissionFacts }) {
  const f = dict.admin.programmeForm;
  const show = shows(dict, names);
  const label = labels(dict);
  const row = (key: keyof PendingDetails) => (
    <div key={key} className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-muted">{label[key]}</dt>
      <dd className="break-words text-[15px] font-medium">
        {key === 'sourceUrl' && details.sourceUrl ? (
          <a href={details.sourceUrl} target="_blank" rel="noreferrer" className="break-all underline">
            {details.sourceUrl.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          show[key]!(details[key])
        )}
      </dd>
    </div>
  );
  const flags = (['hasInterview', 'bumiputeraOnly', 'isStem', 'isTvet', 'jointDegree', 'feeder'] as const).filter((k) => details[k]);
  const stream = details.studyLevel === 'form4_stream';
  return (
    <div className="flex flex-col gap-6">
      <Group title={f.sections.identity}>
        {!stream && row('institutionId')}
        {row('studyLevel')}
        {!stream && row('programCode')}
        {!stream && row('internalCode')}
        {!stream && row('faculty')}
      </Group>
      <Group title={f.sections.academic}>
        {!stream && row('necCode')}
        {row('durationSemesters')}
        {!stream && row('studyMode')}
        {!stream && row('campuses')}
        {row('fieldIds')}
      </Group>
      {!stream && (
        <Group title={f.sections.admission}>
          <div className="flex flex-col gap-0.5 sm:col-span-2">
            <dt className="text-[13px] text-muted">{dict.admin.programme.flags}</dt>
            <dd className="flex flex-wrap gap-2 text-[15px] font-medium">
              {flags.length ? flags.map((k) => <span key={k} className="rounded-full bg-[#f1f2f4] px-2.5 py-0.5 text-[13px]">{label[k]}</span>) : dict.admin.programme.values.none}
            </dd>
          </div>
          {admission && <AdmissionRows facts={admission} dict={dict} />}
        </Group>
      )}
      {!stream && (
        <Group title={f.sections.more}>
          <div className="flex flex-col gap-0.5 sm:col-span-2">
            <dt className="text-[13px] text-muted">{label.careers}</dt>
            <dd className="flex flex-wrap gap-1.5 text-[15px] font-medium">
              {details.careers?.length
                ? details.careers.map((c) => (
                    <span key={c} className="rounded-full bg-[#f1f2f4] px-2.5 py-0.5 text-[13px]">
                      {c}
                    </span>
                  ))
                : dict.admin.programme.values.none}
            </dd>
          </div>
          {row('fees')}
          {row('note')}
          {row('sourceUrl')}
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="border-b border-line pb-2 text-[13px] font-semibold text-navy">{title}</h3>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/** A pending change as a before / after table, changed fields only. */
export function ProgrammeChanges({ live, proposed, dict, names, by }: { live: PendingDetails; proposed: PendingDetails; dict: Dictionary; names: DetailNames; by: string }) {
  const c = dict.admin.programme.changes;
  const label = labels(dict);
  const rows = changedFields(live, proposed, shows(dict, names));
  return (
    <section className="flex flex-col gap-3 rounded-[8px] border border-yellow bg-white p-5 lg:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{c.title}</h2>
        <span className="text-[13px] text-muted">{format(c.by, { who: by })}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{c.none}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-[13px] text-muted">
              <tr>
                <th className="py-2 pr-4 font-medium">{c.field}</th>
                <th className="py-2 pr-4 font-medium">{c.now}</th>
                <th className="py-2 font-medium">{c.proposed}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.field}>
                  <td className="py-2.5 pr-4 font-medium">{label[r.field as keyof PendingDetails]}</td>
                  <td className="py-2.5 pr-4 text-muted line-through decoration-muted/50">{r.before}</td>
                  <td className="py-2.5 font-semibold">{r.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Entry routes and the average merit from ePanduan, with whose average it is (SPM leavers or pre-university), or
 * why there is none: ePanduan shows no merit for diploma, DKM and DVM candidates.
 */
function AdmissionRows({ facts, dict }: { facts: AdmissionFacts; dict: Dictionary }) {
  const m = dict.admin.programme.merit;
  const routes: Record<string, string> = dict.requirements.routes;
  const group = averageGroup(facts.entryRoutes);
  return (
    <>
      <div className="flex flex-col gap-0.5">
        <dt className="text-[13px] text-muted">{dict.admin.programme.entryRoutes}</dt>
        <dd className="text-[15px] font-medium">{facts.entryRoutes.length ? facts.entryRoutes.map((r) => routes[r] ?? r).join(', ') : dict.admin.programme.values.none}</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-[13px] text-muted">{m.label}</dt>
        <dd className="text-[15px] font-medium">
          {facts.averageMerit ? (
            <>
              <span className="tabular-nums">{facts.averageMerit.value.toFixed(2)}%</span>
              <span className="block text-[13px] font-normal text-muted">
                {format(m.detail, { year: facts.averageMerit.intakeYear, group: group === 'preu' ? m.groupPreu : group === 'spm' ? m.groupSpm : m.groupUnknown })}
              </span>
            </>
          ) : (
            <span className="text-[13px] font-normal text-muted">{group ? m.none : m.noneForRoutes}</span>
          )}
        </dd>
      </div>
    </>
  );
}
