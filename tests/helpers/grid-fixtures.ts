import type { CrosswordPuzzle, LexiconEntry } from '../../src/content/schemas';
import type { AnswerReference, GeneratedLayout, GeneratedLayoutEntry } from '../../src/domain/grid-types';
import { provenanceFixture } from './schema-fixtures';

// Synthetic sequences, never a lexical source, editorial approval or catalog.
export function numberFixture(entries: GeneratedLayoutEntry[]): GeneratedLayoutEntry[] {
  const starts = [...new Set(entries.map((entry) => `${entry.row}:${entry.col}`))]
    .sort((a, b) => { const [ar = 0, ac = 0] = a.split(':').map(Number); const [br = 0, bc = 0] = b.split(':').map(Number); return ar - br || ac - bc; });
  return entries.map((entry) => ({ ...entry, number: starts.indexOf(`${entry.row}:${entry.col}`) + 1 }));
}

export function denseFixture(gridRows = ['ABC', 'DEF', 'GHI']): { layout: GeneratedLayout; answers: AnswerReference[] } {
  const width = gridRows[0]?.length ?? 0;
  const entries: GeneratedLayoutEntry[] = [];
  const answers: AnswerReference[] = [];
  for (let row = 0; row < gridRows.length; row++) {
    const entryId = `row-${row}`;
    entries.push({ entryId, number: 0, direction: 'across', row, col: 0, length: width });
    answers.push({ entryId, canonicalAnswer: gridRows[row] ?? '' });
  }
  for (let col = 0; col < width; col++) {
    const entryId = `col-${col}`;
    entries.push({ entryId, number: 0, direction: 'down', row: 0, col, length: gridRows.length });
    answers.push({ entryId, canonicalAnswer: gridRows.map((row) => row[col]).join('') });
  }
  return { layout: { gridRows: [...gridRows], entries: numberFixture(entries) }, answers };
}

export function lexiconFor(answers: readonly AnswerReference[]): LexiconEntry[] {
  return answers.map(({ entryId, canonicalAnswer }, index) => ({
    entryId, canonicalAnswer, displayAnswer: canonicalAnswer, enumeration: [canonicalAnswer.length],
    category: index % 2 ? 'science' : 'vocabulary', tags: ['SYNTHETIC_TEST_ONLY'], estimatedDifficulty: 2,
    provenance: [provenanceFixture()], editorialStatus: 'draft',
  }));
}

export function puzzleFor(layout: GeneratedLayout): CrosswordPuzzle {
  return {
    schemaVersion: 1, catalogVersion: '0.1.0', puzzleId: 'synthetic-grid-only', title: 'TEST ONLY — not approved content',
    gridRows: [...layout.gridRows],
    entries: layout.entries.map((entry) => ({ ...entry, clueId: `test-clue-${entry.entryId}`, clueText: 'Texto sintético exclusivo de teste', enumeration: [entry.length], category: 'vocabulary' })),
    reviewer: 'TEST_ONLY_NOT_HUMAN_APPROVAL', reviewedAt: '2026-10-20T12:00:00Z', editorialStatus: 'editorial_approved',
  };
}
