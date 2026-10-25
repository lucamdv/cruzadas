import type { GeneratedLayoutEntry } from './grid-types';

export interface LetterRun { direction: 'across' | 'down'; row: number; col: number; length: number; answer: string }

/** Derives maximal physical sequences from the board, independently of entries. */
export function scanRuns(gridRows: readonly string[]): LetterRun[] {
  const runs: LetterRun[] = [];
  const rows = gridRows.length; const cols = gridRows[0]?.length ?? 0;
  for (const direction of ['across', 'down'] as const) {
    const dr = direction === 'down' ? 1 : 0; const dc = direction === 'across' ? 1 : 0;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      if (gridRows[row]?.[col] === '#' || gridRows[row]?.[col] === undefined) continue;
      const previous = gridRows[row - dr]?.[col - dc];
      if (previous !== undefined && previous !== '#') continue;
      let answer = ''; let r = row; let c = col;
      while (r < rows && c < cols && gridRows[r]?.[c] !== '#') {
        answer += gridRows[r]?.[c] ?? ''; r += dr; c += dc;
      }
      if (answer.length > 1) runs.push({ direction, row, col, length: answer.length, answer });
    }
  }
  return runs;
}

export function runKey(entry: Pick<GeneratedLayoutEntry, 'row' | 'col' | 'direction' | 'length'>): string {
  return `${entry.direction}:${entry.row}:${entry.col}:${entry.length}`;
}
