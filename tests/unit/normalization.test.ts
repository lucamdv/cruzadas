import { describe, expect, it } from 'vitest';
import { buildEnumeration, normalizeAnswer } from '../../src/domain/normalization';

describe('normalização lexical pt-BR', () => {
  it.each([
    ['NOR-01', 'Coração', 'CORACAO', [7]],
    ['NOR-02', 'São Paulo', 'SAOPAULO', [3, 5]],
    ['NOR-03', 'água-de-coco', 'AGUADECOCO', [4, 2, 4]],
    ['cedilha', 'Çç', 'CC', [2]],
    ['diacríticos pt-BR', 'áàâãéêíóôõúüç', 'AAAAEEIOOOUUC', [13]],
    ['NFD', 'Coração'.normalize('NFD'), 'CORACAO', [7]],
    ['NFD composto', 'São Paulo'.normalize('NFD'), 'SAOPAULO', [3, 5]],
    ['separadores ASCII', '  São   Paulo - SP  ', 'SAOPAULOSP', [3, 5, 2]],
    ['ASCII', 'abcXYZ', 'ABCXYZ', [6]],
  ])('%s: preserva a grafia e produz grade e enumeração', (_id, original, canonical, enumeration) => {
    expect(normalizeAnswer(original)).toBe(canonical);
    expect(buildEnumeration(original)).toEqual(enumeration);
    expect(buildEnumeration(original).reduce((total, length) => total + length, 0)).toBe(canonical.length);
    expect(normalizeAnswer(canonical)).toBe(canonical);
  });

  const invalidAnswers = [
    '', '   ', 'abc1', '🙂', 'São🙂Paulo', 'São_Paulo', 'a.b', "d'água", 'João—Pedro',
    'João–Pedro', 'a\tb', 'a\nb', 'a\n', '-casa', 'casa-', 'casa--azul', 'a - - b',
    'ß', 'œ', 'Ł', 'α', 'K', 'İ', 'a\u00a0b', '\u0301', 'q\u0301', 'a\u0301\u0301',
  ];

  describe.each([
    ['normalizeAnswer', normalizeAnswer],
    ['buildEnumeration', buildEnumeration],
  ] as const)('%s', (_name, operation) => {
    it.each(invalidAnswers)('NOR-04: rejeita explicitamente %j', (answer) => {
      expect(() => operation(answer)).toThrow(RangeError);
    });
  });
});
