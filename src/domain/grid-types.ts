import type { Direction, LexiconEntry } from '../content/schemas';

export interface GeneratedLayoutEntry {
  entryId: string;
  number: number;
  direction: Direction;
  row: number;
  col: number;
  length: number;
}

export interface GeneratedLayout {
  gridRows: string[];
  entries: GeneratedLayoutEntry[];
}

export type AnswerReference = Pick<LexiconEntry, 'entryId' | 'canonicalAnswer'>;
export interface ValidationIssue { code: string; message: string; location?: string }
export interface LayoutMetrics {
  checkedCellRate: number;
  wordsAcross: number;
  wordsDown: number;
  connectedComponents: number;
  filledCells: number;
  checkedCells: number;
  intersectionsByEntry: Record<string, number>;
  orientationBalance: number;
}
export interface ValidationResult { ok: boolean; errors: ValidationIssue[]; metrics: LayoutMetrics }

export const GRID_LIMITS = Object.freeze({ maxDimension: 31, maxEntries: 128, minWordLength: 3, minCrossings: 2, minCheckedCellRate: 0.65 });
