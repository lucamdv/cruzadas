import { GRID_LIMITS } from './grid-types';
import type { GeneratedLayout, LayoutMetrics, ValidationIssue } from './grid-types';

export interface CellClaim { entryIndex: number; direction: 'across' | 'down' }
export type CellClaims = Map<string, CellClaim[]>;

export function emptyMetrics(): LayoutMetrics {
  return { checkedCellRate: 0, wordsAcross: 0, wordsDown: 0, connectedComponents: 0, filledCells: 0, checkedCells: 0, intersectionsByEntry: {}, orientationBalance: 0 };
}

export function measureQuality(layout: GeneratedLayout, claims: CellClaims): LayoutMetrics {
  const graph = layout.entries.map(() => new Set<number>());
  const intersections = layout.entries.map(() => 0);
  let checkedCells = 0;
  for (const cell of claims.values()) {
    if (!cell.some((claim) => claim.direction === 'across') || !cell.some((claim) => claim.direction === 'down')) continue;
    checkedCells++;
    for (const claim of cell) {
      intersections[claim.entryIndex] = (intersections[claim.entryIndex] ?? 0) + 1;
      for (const other of cell) if (other.entryIndex !== claim.entryIndex) graph[claim.entryIndex]?.add(other.entryIndex);
    }
  }
  const visited = new Set<number>();
  let connectedComponents = 0;
  for (let index = 0; index < graph.length; index++) {
    if (visited.has(index)) continue;
    connectedComponents++;
    const pending = [index];
    while (pending.length) {
      const current = pending.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of graph[current] ?? []) if (!visited.has(neighbor)) pending.push(neighbor);
    }
  }
  const filledCells = layout.gridRows.reduce((total, row) => total + [...row].filter((letter) => letter !== '#').length, 0);
  const wordsAcross = layout.entries.filter((entry) => entry.direction === 'across').length;
  const wordsDown = layout.entries.length - wordsAcross;
  return {
    checkedCellRate: filledCells ? checkedCells / filledCells : 0, filledCells, checkedCells,
    wordsAcross, wordsDown, connectedComponents,
    intersectionsByEntry: Object.fromEntries(layout.entries.map((entry, index) => [entry.entryId, intersections[index] ?? 0])),
    orientationBalance: Math.max(wordsAcross, wordsDown) ? Math.min(wordsAcross, wordsDown) / Math.max(wordsAcross, wordsDown) : 0,
  };
}

export function qualityIssues(metrics: LayoutMetrics): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  if (!metrics.wordsAcross || !metrics.wordsDown) errors.push({ code: 'MissingDirection', message: 'São necessárias entradas nas duas direções.' });
  if (metrics.connectedComponents !== 1) errors.push({ code: 'Disconnected', message: 'O grafo das entradas deve ter um componente.' });
  for (const [entryId, count] of Object.entries(metrics.intersectionsByEntry)) {
    if (count < GRID_LIMITS.minCrossings) errors.push({ code: 'InsufficientCrossings', location: entryId, message: `Entrada possui ${count} cruzamentos; mínimo ${GRID_LIMITS.minCrossings}.` });
  }
  if (metrics.checkedCellRate < GRID_LIMITS.minCheckedCellRate) errors.push({ code: 'LowCheckedCellRate', message: `Taxa ${metrics.checkedCellRate}; mínimo ${GRID_LIMITS.minCheckedCellRate}.` });
  return errors;
}
