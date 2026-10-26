import 'server-only';
import { StudentSnapshot } from '@edulaunch/contracts';
import { z } from 'zod';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';

export const EducationLevel = StudentSnapshot.shape.educationLevel;
export type EducationLevel = z.infer<typeof EducationLevel>;

const Me = z.object({ studentId: z.uuid(), educationLevel: EducationLevel.nullable(), formYear: z.number().nullable() });
export type Me = z.infer<typeof Me>;

/** Calls the profile service through the gateway as the signed-in student. */
async function call<T extends z.ZodType>(token: string, path: string, schema: T, init: RequestInit = {}): Promise<z.infer<T>> {
  const res = await fetch(`${GATEWAY_URL}/api/profile${path}`, {
    ...init,
    headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Profile request failed (${res.status}) for ${path}`);
  return schema.parse(await res.json());
}

/** Creates the profile on first use. */
export const getMe = (token: string) => call(token, '/me', Me);

export const setEducationLevel = (token: string, level: EducationLevel, formYear: number | null) =>
  call(token, '/me/education-level', Me, { method: 'PATCH', body: JSON.stringify({ level, formYear }) });

export const Qualification = z.enum(['spm', 'school', 'stpm']);
export const RecordKind = z.enum(['actual', 'target', 'school']);
export type Qualification = z.infer<typeof Qualification>;
export type RecordKind = z.infer<typeof RecordKind>;

const AcademicRecord = z.object({
  id: z.uuid(),
  qualification: Qualification,
  kind: RecordKind,
  examYear: z.number().nullable(),
  subjects: z.array(z.object({ subjectId: z.uuid(), grade: z.string(), customName: z.string().nullable() })),
  status: z.enum(['draft', 'confirmed']),
});
export type AcademicRecord = z.infer<typeof AcademicRecord>;

/** The student's record of one kind (school grades, SPM targets or actual SPM), or null before the first save. */
export async function getCurrentRecord(token: string, qualification: Qualification, kind: RecordKind, examYear: number | null = null) {
  const year = examYear ? `&examYear=${examYear}` : '';
  const { record } = await call(token, `/me/records/current?qualification=${qualification}&kind=${kind}${year}`, z.object({ record: AcademicRecord.nullable() }));
  return record;
}

export interface SaveRecordBody {
  qualification: Qualification;
  kind: RecordKind;
  examYear: number | null;
  subjects: Array<{ subjectId: string; grade: string; customName: string | null }>;
}

export const saveCurrentRecord = (token: string, body: SaveRecordBody) => call(token, '/me/records/current', AcademicRecord, { method: 'PUT', body: JSON.stringify(body) });

/** Every saved record: the student's academic history across levels, newest exam year first. */
export const listRecords = (token: string) => call(token, '/me/records', z.array(AcademicRecord));

export const getRecord = (token: string, id: string) => call(token, `/me/records/${encodeURIComponent(id)}`, AcademicRecord);
