/** Programmes compared side by side: at most this many, so the table stays readable on a laptop. */
export const MAX_COMPARED = 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The programmes to compare from the address (?p=a,b or ?p=a&p=b), kept to saved ones, without repeats, at most
 * MAX_COMPARED; with none asked for, the newest saved ones. `tooMany` says some were left out.
 */
export function pickCompared(asked: string | string[] | undefined, savedNewestFirst: string[]): { ids: string[]; tooMany: boolean } {
  const saved = new Set(savedNewestFirst);
  const wanted = (Array.isArray(asked) ? asked : asked ? [asked] : []).flatMap((v) => v.split(',')).map((v) => v.trim()).filter((v) => UUID.test(v) && saved.has(v));
  const unique = [...new Set(wanted)];
  if (!asked) return { ids: savedNewestFirst.slice(0, MAX_COMPARED), tooMany: false };
  return { ids: unique.slice(0, MAX_COMPARED), tooMany: unique.length > MAX_COMPARED };
}

/** A row is highlighted when its values are not all the same (ignoring rows where nothing is known). */
export function differs(values: Array<string | null>): boolean {
  const known = values.filter((v): v is string => v !== null && v !== '');
  return known.length > 1 && new Set(known.map((v) => v.toLocaleLowerCase())).size > 1;
}
