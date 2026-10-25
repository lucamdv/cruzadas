// SYNTHETIC TEST DATA ONLY. Review fields exercise schema shape, not human
// approval. This fixture is not a production-quality grid or a public catalog.
export const fixtureTimestamp = '2026-10-20T12:00:00-03:00';

export function provenanceFixture() {
  return {
    sourceId: 'synthetic-test-only',
    sourceUrl: 'https://example.invalid/test-source',
    sourceSnapshot: 'fixture-1',
    licenseId: 'TEST_ONLY_NOT_A_LICENSE',
    attribution: 'Dados sintéticos exclusivos de teste',
    retrievedAt: fixtureTimestamp,
  };
}

export function lexiconFixture() {
  return {
    entryId: 'test-sao-paulo',
    displayAnswer: 'São Paulo',
    canonicalAnswer: 'SAOPAULO',
    enumeration: [3, 5],
    category: 'geography',
    tags: ['TEST_ONLY'],
    estimatedDifficulty: 2,
    provenance: [provenanceFixture()],
    editorialStatus: 'draft',
  };
}

export function clueFixture() {
  return {
    clueId: 'test-clue',
    entryId: 'test-sao-paulo',
    clueText: 'Capital paulista',
    difficulty: 2,
    clueKind: 'fact',
    evidence: [provenanceFixture()],
    generator: { provider: 'human' },
    flags: ['TEST_ONLY'],
    review: { status: 'draft' },
  };
}

export function puzzleFixture() {
  return {
    schemaVersion: 1,
    catalogVersion: '0.1.0',
    puzzleId: 'test-cross',
    title: 'FIXTURE — não publicável',
    gridRows: ['#S#', 'MAR', '#L#'],
    entries: [
      { entryId: 'test-sal', clueId: 'test-sal-clue', number: 1, direction: 'down', row: 0, col: 1, length: 3, clueText: 'Cristais usados no tempero', enumeration: [3], category: 'vocabulary' },
      { entryId: 'test-mar', clueId: 'test-mar-clue', number: 2, direction: 'across', row: 1, col: 0, length: 3, clueText: 'Extensão de água salgada', enumeration: [3], category: 'geography' },
    ],
    reviewer: 'TEST_ONLY_NOT_HUMAN_APPROVAL',
    reviewedAt: fixtureTimestamp,
    editorialStatus: 'editorial_approved',
  };
}

export function manifestRefFixture() {
  return { puzzleId: 'test-cross', path: '/catalog/free/test-cross.json', sha256: 'a'.repeat(64) };
}

export function manifestFixture() {
  return {
    schemaVersion: 1,
    catalogVersion: '0.1.0',
    publishedAt: fixtureTimestamp,
    timezone: 'America/Recife',
    daily: { '2026-10-20': manifestRefFixture() },
    free: [manifestRefFixture()],
    attributionPath: '/catalog/ATTRIBUTION.md',
  };
}

export function sessionFixture() {
  return {
    sessionId: '11111111-1111-4111-8111-111111111111',
    puzzleId: 'test-cross',
    catalogVersion: '0.1.0',
    mode: 'daily',
    dateKey: '2026-10-20',
    status: 'in_progress',
    lettersByCell: { '1:1': 'A' },
    activeCell: '1:1',
    activeDirection: 'across',
    activeSeconds: 12,
    assistsUsed: 0,
    checksUsed: 0,
    createdAt: fixtureTimestamp,
    updatedAt: fixtureTimestamp,
    revision: 1,
  };
}

export function completionFixture() {
  return {
    dateKey: '2026-10-20',
    puzzleId: 'test-cross',
    sessionId: sessionFixture().sessionId,
    completedAt: fixtureTimestamp,
    assisted: false,
    activeSeconds: 12,
  };
}

export function stateFixture() {
  const session = sessionFixture();
  return {
    schemaVersion: 1,
    dailyCompletions: [completionFixture()],
    sessions: { [session.sessionId]: session },
    recentFreePuzzleIds: [],
    bestStreak: 1,
  };
}
