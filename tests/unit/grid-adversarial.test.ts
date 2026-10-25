// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validateLayout } from '../../src/domain/grid';
import { denseFixture, numberFixture } from '../helpers/grid-fixtures';

describe('limites e qualidade adversariais do validador', () => {
  it('rejeita identidade vazia composta somente por espaços', () => {
    const { layout } = denseFixture();
    layout.entries[0] = { ...layout.entries[0]!, entryId: '   ' };
    expect(validateLayout(layout).ok).toBe(false);
  });

  it('mede duas interseções corretamente, mas reprova checkedCellRate abaixo de 0,65', () => {
    const result = validateLayout({
      gridRows: ['ABC', 'D#E', 'FGH'],
      entries: numberFixture([
        { entryId: 'a1', row: 0, col: 0, direction: 'across', length: 3, number: 0 },
        { entryId: 'a2', row: 2, col: 0, direction: 'across', length: 3, number: 0 },
        { entryId: 'd1', row: 0, col: 0, direction: 'down', length: 3, number: 0 },
        { entryId: 'd2', row: 0, col: 2, direction: 'down', length: 3, number: 0 },
      ]),
    });
    expect(result.metrics.checkedCellRate).toBe(0.5);
    expect(Object.values(result.metrics.intersectionsByEntry)).toEqual([2, 2, 2, 2]);
    expect(result.errors.map((error) => error.code)).toEqual(['LowCheckedCellRate']);
  });

  it('aceita taxa não perfeita quando todos os gates canônicos são atendidos', () => {
    const { layout, answers } = denseFixture();
    const expanded = {
      gridRows: ['XABCY', '#DEF#', '#GHI#'],
      entries: numberFixture(layout.entries.map((entry) => entry.entryId === 'row-0'
        ? { ...entry, length: 5 }
        : { ...entry, col: entry.col + 1 })),
    };
    const references = answers.map((entry) => entry.entryId === 'row-0' ? { ...entry, canonicalAnswer: 'XABCY' } : entry);
    const result = validateLayout(expanded, references);
    expect(result.ok).toBe(true);
    expect(result.metrics.checkedCells).toBe(9);
    expect(result.metrics.filledCells).toBe(11);
    expect(result.metrics.checkedCellRate).toBe(9 / 11);
  });

  it.each([
    { gridRows: Array.from({ length: 32 }, () => 'ABC'), entries: [] },
    { gridRows: ['A'.repeat(32)], entries: [] },
    { gridRows: ['ABC'], entries: Array.from({ length: 129 }, () => ({})) },
  ])('encerra com diagnóstico em dimensões/pool geométrico excessivo', (layout) => {
    expect(validateLayout(layout)).toMatchObject({ ok: false });
  });

  it('não confunde mesma posição em direções opostas com igualdade de IDs', () => {
    const { layout, answers } = denseFixture();
    const before = JSON.stringify({ layout, answers });
    expect(validateLayout(layout, answers).ok).toBe(true);
    expect(JSON.stringify({ layout, answers })).toBe(before);
    expect(validateLayout(layout, [{ entryId: 'row-0', canonicalAnswer: 'ABC' }, { entryId: 'row-0', canonicalAnswer: 'XYZ' }]).ok).toBe(false);
  });

  it('remoção de qualquer entrada de uma grade densa é detectada', () => {
    const { layout } = denseFixture();
    for (const removed of layout.entries) {
      const modified = { ...layout, entries: layout.entries.filter((entry) => entry.entryId !== removed.entryId) };
      expect(validateLayout(modified).ok).toBe(false);
    }
  });
});
