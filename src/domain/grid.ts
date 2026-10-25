import { CrosswordPuzzleSchema } from '../content/schemas';
import { GRID_LIMITS } from './grid-types';
import type { AnswerReference, GeneratedLayout, ValidationIssue, ValidationResult } from './grid-types';
import { GeneratedLayoutSchema, withinLayoutLimits } from './grid-shape';
import { emptyMetrics, measureQuality, qualityIssues } from './grid-quality';
import type { CellClaims } from './grid-quality';
import { runKey, scanRuns } from './grid-runs';

function invalid(code: string, message: string): ValidationResult {
  return { ok: false, errors: [{ code, message }], metrics: emptyMetrics() };
}

function referenceMap(answers: readonly AnswerReference[] | undefined, errors: ValidationIssue[]): Map<string, string> | undefined {
  if (answers === undefined) return undefined;
  if (!Array.isArray(answers) || answers.length > 256) {
    errors.push({ code: 'InvalidReferences', message: 'Contexto lexical inválido ou excessivo.' });
    return new Map();
  }
  const result = new Map<string, string>();
  for (const item of answers) {
    if (!item || typeof item.entryId !== 'string' || typeof item.canonicalAnswer !== 'string' || !item.canonicalAnswer.length || /[^A-Z]/u.test(item.canonicalAnswer)) {
      errors.push({ code: 'InvalidReferences', message: 'Resposta de referência inválida.' }); continue;
    }
    if (result.has(item.entryId) && result.get(item.entryId) !== item.canonicalAnswer) errors.push({ code: 'InvalidReferences', location: item.entryId, message: 'Identidade lexical contraditória.' });
    result.set(item.entryId, item.canonicalAnswer);
  }
  return result;
}

function inspectEntries(layout: GeneratedLayout, answers: Map<string, string> | undefined, errors: ValidationIssue[]): CellClaims {
  const claims: CellClaims = new Map(); const ids = new Set<string>(); const seenAnswers = new Set<string>();
  const starts = [...new Map(layout.entries.map((entry) => [`${entry.row}:${entry.col}`, entry])).values()]
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const numbers = new Map(starts.map((entry, index) => [`${entry.row}:${entry.col}`, index + 1]));
  for (const [entryIndex, entry] of layout.entries.entries()) {
    const location = entry.entryId;
    if (ids.has(entry.entryId)) errors.push({ code: 'DuplicateEntry', location, message: 'entryId repetido.' });
    ids.add(entry.entryId);
    if (entry.number !== numbers.get(`${entry.row}:${entry.col}`)) errors.push({ code: 'InvalidNumbering', location, message: 'Numeração deve seguir os inícios em ordem de leitura.' });
    if (entry.length < GRID_LIMITS.minWordLength) errors.push({ code: 'EntryTooShort', location, message: 'Entradas normais devem ter pelo menos três letras.' });
    const dr = entry.direction === 'down' ? 1 : 0; const dc = entry.direction === 'across' ? 1 : 0;
    if (entry.row + dr * (entry.length - 1) >= layout.gridRows.length || entry.col + dc * (entry.length - 1) >= (layout.gridRows[0]?.length ?? 0)) {
      errors.push({ code: 'OutOfBounds', location, message: 'Entrada fora da grade.' }); continue;
    }
    let answer = '';
    for (let offset = 0; offset < entry.length; offset++) {
      const row = entry.row + dr * offset; const col = entry.col + dc * offset; const key = `${row}:${col}`;
      const letter = layout.gridRows[row]?.[col] ?? '#'; answer += letter;
      if (letter === '#') errors.push({ code: 'BlockedCell', location: key, message: 'Entrada atravessa um bloco.' });
      const cell = claims.get(key) ?? [];
      if (cell.some((claim) => claim.direction === entry.direction)) errors.push({ code: 'SameDirectionOverlap', location: key, message: 'Sobreposição na mesma direção.' });
      cell.push({ entryIndex, direction: entry.direction }); claims.set(key, cell);
    }
    if (seenAnswers.has(answer)) errors.push({ code: 'DuplicateAnswer', location, message: 'Resposta repetida na grade.' });
    seenAnswers.add(answer);
    if (answers && !answers.has(entry.entryId)) errors.push({ code: 'UnknownEntry', location, message: 'Entrada sem referência lexical.' });
    else if (answers && answers.get(entry.entryId) !== answer) errors.push({ code: 'LetterMismatch', location, message: 'Letras não correspondem exatamente à resposta.' });
  }
  return claims;
}

export function validateLayout(value: unknown, answers?: readonly AnswerReference[]): ValidationResult {
  if (!withinLayoutLimits(value)) return invalid('InvalidLayout', 'Formato ausente ou acima dos limites de recursos.');
  const parsed = GeneratedLayoutSchema.safeParse(value);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((issue) => ({ code: 'InvalidLayout', message: issue.message, location: issue.path.join('.') })), metrics: emptyMetrics() };
  const layout = parsed.data; const errors: ValidationIssue[] = [];
  const references = referenceMap(answers, errors);
  const claims = inspectEntries(layout, references, errors);
  const declared = new Set(layout.entries.map(runKey));
  for (const run of scanRuns(layout.gridRows)) if (!declared.has(runKey(run))) errors.push({ code: 'GhostWord', location: runKey(run), message: 'Sequência física sem entrada correspondente.' });
  for (const [row, line] of layout.gridRows.entries()) for (let col = 0; col < line.length; col++) {
    if (line[col] !== '#' && !claims.has(`${row}:${col}`)) errors.push({ code: 'UnclaimedCell', location: `${row}:${col}`, message: 'Letra sem entrada.' });
  }
  const metrics = measureQuality(layout, claims);
  errors.push(...qualityIssues(metrics));
  return { ok: errors.length === 0, errors, metrics };
}

export function validatePuzzle(puzzle: unknown, answers?: readonly AnswerReference[]): ValidationResult {
  if (!withinLayoutLimits(puzzle)) return invalid('InvalidPuzzle', 'Puzzle acima dos limites ou inválido.');
  const parsed = CrosswordPuzzleSchema.safeParse(puzzle);
  if (!parsed.success) return invalid('InvalidPuzzle', 'Puzzle completo viola o schema canônico.');
  const { gridRows, entries } = parsed.data;
  const result = validateLayout({ gridRows, entries: entries.map(({ entryId, number, direction, row, col, length }) => ({ entryId, number, direction, row, col, length })) }, answers);
  if (new Set(entries.map((entry) => entry.clueId)).size !== entries.length) result.errors.push({ code: 'ClueMismatch', message: 'Cada entrada exige uma referência de pista distinta.' });
  return { ...result, ok: result.errors.length === 0 };
}

export type { GeneratedLayout, GeneratedLayoutEntry, ValidationResult, LayoutMetrics } from './grid-types';
