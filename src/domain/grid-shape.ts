import { z } from 'zod';
import { GRID_LIMITS } from './grid-types';

export const GeneratedLayoutEntrySchema = z.strictObject({
  entryId: z.string().min(1).max(256).refine((value) => value.trim().length > 0),
  number: z.number().int().positive(),
  direction: z.enum(['across', 'down']),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  length: z.number().int().positive().max(GRID_LIMITS.maxDimension),
});

export const GeneratedLayoutSchema = z.strictObject({
  gridRows: z.array(z.string().min(1).max(GRID_LIMITS.maxDimension).refine((row) => !/[^A-Z#]/u.test(row))).min(1).max(GRID_LIMITS.maxDimension),
  entries: z.array(GeneratedLayoutEntrySchema).min(1).max(GRID_LIMITS.maxEntries),
}).refine((layout) => layout.gridRows.every((row) => row.length === layout.gridRows[0]?.length), { path: ['gridRows'], message: 'Grade deve ser retangular.' });

// Reject grossly oversized containers before invoking recursive field parsing.
export function withinLayoutLimits(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { gridRows?: unknown; entries?: unknown };
  return Array.isArray(candidate.gridRows) && candidate.gridRows.length <= GRID_LIMITS.maxDimension
    && Array.isArray(candidate.entries) && candidate.entries.length <= GRID_LIMITS.maxEntries;
}
