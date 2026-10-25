// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validateLayout, validatePuzzle } from '../../src/domain/grid';
import type { GeneratedLayout } from '../../src/domain/grid-types';
import { denseFixture, numberFixture, puzzleFor } from '../helpers/grid-fixtures';

const codes = (layout: unknown) => validateLayout(layout).errors.map((error) => error.code);

describe('validação geométrica independente', () => {
  it('GRD-01: aceita cruzamentos exatos e mede células físicas uma única vez', () => {
    const { layout, answers } = denseFixture();
    const result = validateLayout(layout, answers);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.metrics).toMatchObject({ checkedCellRate: 1, filledCells: 9, checkedCells: 9, wordsAcross: 3, wordsDown: 3, connectedComponents: 1, orientationBalance: 1 });
    expect(Object.values(result.metrics.intersectionsByEntry)).toEqual([3, 3, 3, 3, 3, 3]);
  });

  it('GRD-01: rejeita letra divergente da resposta de referência', () => {
    const { layout, answers } = denseFixture();
    layout.gridRows[1] = 'DZF';
    expect(validateLayout(layout, answers).errors.map((error) => error.code)).toContain('LetterMismatch');
  });

  it('GRD-02: rejeita entrada fora dos limites', () => {
    const { layout } = denseFixture();
    layout.entries[0] = { ...layout.entries[0]!, col: 99 };
    expect(codes(layout)).toContain('OutOfBounds');
  });

  it('GRD-03: rejeita dois componentes completos, mesmo com 100% de cruzamentos', () => {
    const a = denseFixture(); const b = denseFixture(['JKL', 'MNO', 'PQR']);
    const layout: GeneratedLayout = {
      gridRows: ['ABC####', 'DEF####', 'GHI####', '#######', '####JKL', '####MNO', '####PQR'],
      entries: numberFixture([...a.layout.entries, ...b.layout.entries.map((entry) => ({ ...entry, entryId: `b-${entry.entryId}`, row: entry.row + 4, col: entry.col + 4 }))]),
    };
    const result = validateLayout(layout);
    expect(result.metrics.checkedCellRate).toBe(1);
    expect(result.metrics.connectedComponents).toBe(2);
    expect(result.errors.map((error) => error.code)).toContain('Disconnected');
  });

  it('GRD-04: rejeita sequência não cadastrada criada por adjacências', () => {
    const { layout } = denseFixture();
    layout.entries = layout.entries.filter((entry) => entry.entryId !== 'col-1');
    expect(codes(layout)).toContain('GhostWord');
  });

  it('rejeita sobreposição na mesma direção mesmo com letras iguais', () => {
    const { layout } = denseFixture();
    layout.entries.push({ ...layout.entries[0]!, entryId: 'overlap' });
    expect(codes(layout)).toContain('SameDirectionOverlap');
  });

  it('rejeita duplicação de ID e de resposta em posições distintas', () => {
    const { layout } = denseFixture();
    layout.entries[1] = { ...layout.entries[1]!, entryId: layout.entries[0]!.entryId };
    expect(codes(layout)).toContain('DuplicateEntry');
    expect(codes(denseFixture(['ABC', 'DEF', 'ABC']).layout)).toContain('DuplicateAnswer');
  });

  it('rejeita célula de letra sem entrada e entrada que atravessa bloco', () => {
    const { layout } = denseFixture();
    const stray = { ...layout, gridRows: ['ABC#Z', 'DEF##', 'GHI##'] };
    expect(codes(stray)).toContain('UnclaimedCell');
    layout.gridRows[1] = 'D#F';
    expect(codes(layout)).toContain('BlockedCell');
  });

  it('exige números por início distintos em ordem de leitura, compartilhados no mesmo início', () => {
    const { layout } = denseFixture();
    expect(layout.entries.filter((entry) => entry.row === 0 && entry.col === 0).map((entry) => entry.number)).toEqual([1, 1]);
    layout.entries[0] = { ...layout.entries[0]!, number: 77 };
    expect(codes(layout)).toContain('InvalidNumbering');
  });

  it('mantém dois cruzamentos por entrada e checkedCellRate mínimo de 0,65', () => {
    const layout: GeneratedLayout = {
      gridRows: ['#A#', 'BCD', '#E#'],
      entries: [
        { entryId: 'down', direction: 'down', row: 0, col: 1, length: 3, number: 1 },
        { entryId: 'across', direction: 'across', row: 1, col: 0, length: 3, number: 2 },
      ],
    };
    const result = validateLayout(layout);
    expect(result.metrics.checkedCellRate).toBe(1 / 5);
    expect(result.errors.map((error) => error.code)).toEqual(expect.arrayContaining(['InsufficientCrossings', 'LowCheckedCellRate']));
  });

  it.each([null, {}, { gridRows: [], entries: [] }, { gridRows: ['A', 'BB'], entries: [] }, { gridRows: ['abc'], entries: [] }])('falha estruturada sem lançar para formato inválido %j', (value) => {
    const result = validateLayout(value);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(Number.isFinite(result.metrics.checkedCellRate)).toBe(true);
  });

  it('rejeita entrada curta, orientação ausente e coordenadas não inteiras', () => {
    const short = denseFixture(['AB', 'CD']);
    expect(codes(short.layout)).toContain('EntryTooShort');
    const { layout } = denseFixture();
    expect(codes({ ...layout, entries: layout.entries.filter((entry) => entry.direction === 'across') })).toContain('MissingDirection');
    expect(validateLayout({ ...layout, entries: [{ ...layout.entries[0], row: 0.5 }] }).ok).toBe(false);
  });

  it('rejeita referência lexical ausente e não altera seus argumentos', () => {
    const { layout, answers } = denseFixture();
    const snapshot = structuredClone(layout);
    expect(validateLayout(layout, answers.slice(1)).errors.map((error) => error.code)).toContain('UnknownEntry');
    validateLayout(layout, answers);
    expect(layout).toEqual(snapshot);
  });

  it('GRD-06: valida puzzle completo sem conferir aprovação humana ou criar pistas', () => {
    const { layout, answers } = denseFixture();
    const puzzle = puzzleFor(layout);
    expect(validatePuzzle(puzzle, answers).ok).toBe(true);
    expect(validatePuzzle({ ...puzzle, reviewer: undefined }).ok).toBe(false);
    const duplicateClues = { ...puzzle, entries: puzzle.entries.map((entry) => ({ ...entry, clueId: 'same-clue' })) };
    expect(validatePuzzle(duplicateClues, answers).errors.map((error) => error.code)).toContain('ClueMismatch');
    expect(validatePuzzle({ ...puzzle, entries: [{ ...puzzle.entries[0], length: 9 }] }).ok).toBe(false);
  });
});
