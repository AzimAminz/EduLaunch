import type { NecField } from './api';

/** NEC fields as dropdown options ("0712 · Electricity and Energy"), searchable by code or name. */
export const necOptions = (list: NecField[]) => list.map((n) => ({ value: n.code, label: `${n.code} · ${n.name}`, keywords: [n.code, n.name], fieldId: n.fieldId }));
