import { describe, expect, it } from 'vitest';
import {
  CatalogManifestSchema, ClueCandidateSchema, CrosswordPuzzleSchema,
  DailyCompletionSchema, GameSessionSchema, LexiconEntrySchema,
  ManifestPuzzleRefSchema, PersistedStateV1Schema, ProvenanceSchema,
} from '../../src/content/schemas';
import {
  clueFixture, completionFixture, fixtureTimestamp, lexiconFixture,
  manifestFixture, manifestRefFixture, provenanceFixture, puzzleFixture,
  sessionFixture, stateFixture,
} from '../helpers/schema-fixtures';

describe('contratos de runtime da fundação', () => {
  it.each([
    ['Provenance', ProvenanceSchema, provenanceFixture],
    ['LexiconEntry', LexiconEntrySchema, lexiconFixture],
    ['ClueCandidate', ClueCandidateSchema, clueFixture],
    ['CrosswordPuzzle', CrosswordPuzzleSchema, puzzleFixture],
    ['ManifestPuzzleRef', ManifestPuzzleRefSchema, manifestRefFixture],
    ['CatalogManifest', CatalogManifestSchema, manifestFixture],
    ['GameSession', GameSessionSchema, sessionFixture],
    ['DailyCompletion', DailyCompletionSchema, completionFixture],
    ['PersistedStateV1', PersistedStateV1Schema, stateFixture],
  ] as const)('%s aceita sua fixture sintética sem alterá-la', (_name, schema, fixture) => {
    const input = fixture();
    expect(schema.parse(input)).toEqual(input);
  });

  it.each([
    ['proveniência vazia', { ...lexiconFixture(), provenance: [] }],
    ['canônica divergente', { ...lexiconFixture(), canonicalAnswer: 'SAOPAUL' }],
    ['canônica com acento', { ...lexiconFixture(), canonicalAnswer: 'SÃOPAULO' }],
    ['enumeração divergente', { ...lexiconFixture(), enumeration: [8] }],
    ['grafia inválida', { ...lexiconFixture(), displayAnswer: 'São_Paulo' }],
    ['categoria desconhecida', { ...lexiconFixture(), category: 'unknown' }],
    ['dificuldade desconhecida', { ...lexiconFixture(), estimatedDifficulty: 4 }],
    ['status desconhecido', { ...lexiconFixture(), editorialStatus: 'published' }],
    ['sem coerção', { ...lexiconFixture(), estimatedDifficulty: '2' }],
  ])('léxico rejeita %s', (_name, input) => {
    const result = LexiconEntrySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.length).toBeGreaterThan(0);
  });

  it.each([
    ['licença ausente', { ...provenanceFixture(), licenseId: undefined }],
    ['licença vazia', { ...provenanceFixture(), licenseId: '   ' }],
    ['data inválida', { ...provenanceFixture(), retrievedAt: '2026-02-30T00:00:00Z' }],
    ['URL executável', { ...provenanceFixture(), sourceUrl: 'javascript:alert(1)' }],
  ])('proveniência rejeita %s', (_name, input) => {
    expect(ProvenanceSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    ['fato sem evidência', { ...clueFixture(), evidence: [] }],
    ['aprovação sem revisor', { ...clueFixture(), review: { status: 'editorial_approved', reviewedAt: fixtureTimestamp } }],
    ['aprovação sem data', { ...clueFixture(), review: { status: 'editorial_approved', reviewer: 'TEST_ONLY' } }],
    ['texto vazio', { ...clueFixture(), clueText: '   ' }],
    ['provider inválido', { ...clueFixture(), generator: { provider: 'browser' } }],
  ])('pista rejeita %s', (_name, input) => {
    expect(ClueCandidateSchema.safeParse(input).success).toBe(false);
  });

  it('aceita o formato de revisão de pista sem alegar revisão real', () => {
    expect(ClueCandidateSchema.safeParse({ ...clueFixture(), review: { status: 'editorial_approved', reviewer: 'TEST_ONLY', reviewedAt: fixtureTimestamp } }).success).toBe(true);
  });

  it.each([
    ['reviewer ausente', { ...puzzleFixture(), reviewer: undefined }],
    ['reviewer vazio', { ...puzzleFixture(), reviewer: ' ' }],
    ['reviewedAt ausente', { ...puzzleFixture(), reviewedAt: undefined }],
    ['status rascunho', { ...puzzleFixture(), editorialStatus: 'draft' }],
    ['linhas irregulares', { ...puzzleFixture(), gridRows: ['#S#', 'MAR', '#L'] }],
    ['grade vazia', { ...puzzleFixture(), gridRows: [] }],
    ['minúsculas', { ...puzzleFixture(), gridRows: ['#s#', 'MAR', '#L#'] }],
    ['letra acentuada', { ...puzzleFixture(), gridRows: ['#S#', 'MÃR', '#L#'] }],
    ['caractere invisível', { ...puzzleFixture(), gridRows: ['#S#', 'MAR', '#L#\n'] }],
    ['sem entradas', { ...puzzleFixture(), entries: [] }],
    ['schema desconhecido', { ...puzzleFixture(), schemaVersion: 2 }],
  ])('puzzle rejeita %s', (_name, input) => {
    expect(CrosswordPuzzleSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    ['hash curto', { ...manifestRefFixture(), sha256: 'abc' }],
    ['hash não hexadecimal', { ...manifestRefFixture(), sha256: 'z'.repeat(64) }],
    ['fora de catalog', { ...manifestRefFixture(), path: '/private/test.json' }],
    ['traversal', { ...manifestRefFixture(), path: '/catalog/../secret.json' }],
    ['traversal codificado', { ...manifestRefFixture(), path: '/catalog/%2e%2e/secret.json' }],
    ['URL externa', { ...manifestRefFixture(), path: 'https://example.invalid/test.json' }],
    ['query', { ...manifestRefFixture(), path: '/catalog/test.json?key=value' }],
  ])('referência rejeita %s', (_name, input) => {
    expect(ManifestPuzzleRefSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    ['data inexistente', { ...manifestFixture(), daily: { '2026-02-30': manifestRefFixture() } }],
    ['data não canônica', { ...manifestFixture(), daily: { '2026-2-3': manifestRefFixture() } }],
    ['data com newline', { ...manifestFixture(), daily: { '2026-10-20\n': manifestRefFixture() } }],
    ['fuso diferente', { ...manifestFixture(), timezone: 'America/Sao_Paulo' }],
    ['versão inválida', { ...manifestFixture(), catalogVersion: '1' }],
    ['pré-release inválido', { ...manifestFixture(), catalogVersion: '1.0.0-01' }],
    ['atribuição diferente', { ...manifestFixture(), attributionPath: '/other.md' }],
  ])('manifest rejeita %s', (_name, input) => {
    expect(CatalogManifestSchema.safeParse(input).success).toBe(false);
  });

  it('aceita formato vazio e data bissexta sem declarar release válido', () => {
    expect(CatalogManifestSchema.safeParse({ ...manifestFixture(), daily: {}, free: [] }).success).toBe(true);
    expect(CatalogManifestSchema.safeParse({ ...manifestFixture(), catalogVersion: '1.0.0-beta.1+test', daily: { '2028-02-29': manifestRefFixture() } }).success).toBe(true);
  });

  it.each([
    ['daily sem data', { ...sessionFixture(), dateKey: undefined }],
    ['free com data', { ...sessionFixture(), mode: 'free' }],
    ['estado not_started', { ...sessionFixture(), status: 'not_started' }],
    ['tempo negativo', { ...sessionFixture(), activeSeconds: -1 }],
    ['tempo fracionário', { ...sessionFixture(), activeSeconds: 1.5 }],
    ['revisão string', { ...sessionFixture(), revision: '1' }],
    ['letra inválida', { ...sessionFixture(), lettersByCell: { '1:1': 'Á' } }],
    ['duas letras', { ...sessionFixture(), lettersByCell: { '1:1': 'AB' } }],
    ['newline na letra', { ...sessionFixture(), lettersByCell: { '1:1': 'A\n' } }],
    ['coordenada negativa', { ...sessionFixture(), lettersByCell: { '-1:1': 'A' } }],
    ['coordenada sem formato', { ...sessionFixture(), activeCell: '1,1' }],
    ['concluída sem instante', { ...sessionFixture(), status: 'completed' }],
    ['em progresso com conclusão', { ...sessionFixture(), completedAt: fixtureTimestamp }],
  ])('sessão rejeita %s', (_name, input) => {
    expect(GameSessionSchema.safeParse(input).success).toBe(false);
  });

  it('aceita sessão livre sem data e conclusão com instante', () => {
    const { dateKey: _date, ...free } = sessionFixture();
    void _date;
    expect(GameSessionSchema.safeParse({ ...free, mode: 'free' }).success).toBe(true);
    expect(GameSessionSchema.safeParse({ ...sessionFixture(), status: 'completed', completedAt: fixtureTimestamp }).success).toBe(true);
  });

  it.each([
    ['versão desconhecida', { ...stateFixture(), schemaVersion: 2 }],
    ['streak negativo', { ...stateFixture(), bestStreak: -1 }],
    ['streak fracionário', { ...stateFixture(), bestStreak: 1.5 }],
    ['histórico inválido', { ...stateFixture(), dailyCompletions: [{ ...completionFixture(), dateKey: '2026-02-30' }] }],
    ['sessão indexada pelo ID errado', { ...stateFixture(), sessions: { wrong: sessionFixture() } }],
    ['livre ativo inexistente', { ...stateFixture(), activeFreeSessionId: 'missing' }],
    ['livre ativo aponta para diário', { ...stateFixture(), activeFreeSessionId: sessionFixture().sessionId }],
    ['campo legado', { ...stateFixture(), completedDailyDates: ['2026-10-20'] }],
    ['currentStreak redundante', { ...stateFixture(), currentStreak: 1 }],
  ])('storage rejeita %s', (_name, input) => {
    expect(PersistedStateV1Schema.safeParse(input).success).toBe(false);
  });

  it('rejeita campos extras também em objetos aninhados', () => {
    const provenance = { ...provenanceFixture(), unexpected: true };
    expect(LexiconEntrySchema.safeParse({ ...lexiconFixture(), provenance: [provenance] }).success).toBe(false);
  });

  it('aceita formato de estado inicial sem executar storage', () => {
    expect(PersistedStateV1Schema.safeParse({ schemaVersion: 1, dailyCompletions: [], sessions: {}, recentFreePuzzleIds: [], bestStreak: 0 }).success).toBe(true);
  });
});
