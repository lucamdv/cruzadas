import { PersistedStateV1Schema, type PersistedStateV1 } from '../content/schemas';
// V1 is the first supported format. Unknown versions must never be rewritten.
export function migrateState(value: unknown): { ok: true; state: PersistedStateV1 } | { ok: false } {
  const parsed = PersistedStateV1Schema.safeParse(value);
  if (!parsed.success) return { ok: false };
  return { ok: true, state: parsed.data };
}
