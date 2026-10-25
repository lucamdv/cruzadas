import { describe, expect, it } from 'vitest';
import { publicDemo } from '../../src/demo/public-demo';
import { normalizeAnswer, buildEnumeration } from '../../src/domain/normalization';
import { validateLayout } from '../../src/domain/grid';
import { validateWordFirst } from '../../scripts/editorial/word-first/validate';
import { GameSessionSchema } from '../../src/content/schemas';
import { createGameSession } from '../../src/domain/session';

const layout = {
  gridRows: publicDemo.gridRows,
  entries: publicDemo.entries.map(({ entryId, number, direction, row, col, length }) => ({ entryId, number, direction, row, col, length })),
};
const answers = publicDemo.entries.map(entry => ({ entryId: entry.entryId, canonicalAnswer: normalizeAnswer(entry.displayAnswer) }));

describe('demonstração pública independente', () => {
  it('inicia uma sessão compatível com o contrato canônico', () => {
    const session = createGameSession(publicDemo, 'alpha-demo-session', '2026-10-25T20:00:00.000Z');
    expect(GameSessionSchema.safeParse(session).success).toBe(true);
  });
  it('passa no scanner independente POC v1.1 com numeração, referências e cruzamentos reais', () => {
    const result = validateWordFirst(layout, answers, 'v11');
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.metrics).toMatchObject({ entries: 11, across: 5, down: 6, crossings: 10, components: 1, filledCells: 39 });
    for (const entry of publicDemo.entries) {
      expect(entry.enumeration).toEqual(buildEnumeration(entry.displayAnswer));
    }
  });

  it('não confunde a validade experimental com o gate de cruzamentos da produção', () => {
    const result = validateLayout(layout, answers);
    expect(result.ok).toBe(false);
    expect([...new Set(result.errors.map(error => error.code))].sort()).toEqual(['InsufficientCrossings', 'LowCheckedCellRate']);
  });

  it('rejeita letras conflitantes, sequência fantasma e numeração incorreta', () => {
    const corrupted = { ...layout, gridRows: layout.gridRows.map((row, index) => index === 1 ? row.replace('SOL', 'SAL') : row) };
    expect(validateWordFirst(corrupted, answers, 'v11').errors).toContain('LetterMismatch');
    const ghost = { ...layout, gridRows: layout.gridRows.map((row, index) => index === 0 ? 'ABC########' : row) };
    expect(validateWordFirst(ghost, answers, 'v11').errors).toContain('GhostRun');
    const badNumber = { ...layout, entries: layout.entries.map((entry, index) => index === 0 ? { ...entry, number: 99 } : entry) };
    expect(validateWordFirst(badNumber, answers, 'v11').errors).toContain('Numbering');
  });
});
