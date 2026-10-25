const unsupportedComposed = /[^A-Za-zÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüç -]/u;
const decompositionMarks = new Set(['\u0300', '\u0301', '\u0302', '\u0303', '\u0308', '\u0327']);

function canonicalSegments(displayAnswer: string): string[] {
  // Check before NFC as well: canonical equivalents such as K must not
  // silently introduce characters outside the explicitly supported alphabet.
  if ([...displayAnswer].some((character) => unsupportedComposed.test(character) && !decompositionMarks.has(character))) {
    throw new RangeError('Resposta contém caracteres não suportados.');
  }
  const composed = displayAnswer.normalize('NFC');
  if (unsupportedComposed.test(composed)) {
    throw new RangeError('Resposta contém diacríticos não suportados.');
  }
  const segments = composed.replace(/^ +| +$/gu, '').split(/ *- *| +/u);
  if (segments.some((segment) => segment.length === 0)) {
    throw new RangeError('Resposta vazia ou separadores inválidos.');
  }
  return segments.map((segment) => segment.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase());
}

/** Preserves displayAnswer; returns only the canonical A–Z grid representation. */
export function normalizeAnswer(displayAnswer: string): string {
  return canonicalSegments(displayAnswer).join('');
}

export function buildEnumeration(displayAnswer: string): number[] {
  return canonicalSegments(displayAnswer).map((segment) => segment.length);
}
