import { z } from 'zod';
import { buildEnumeration, normalizeAnswer } from '../domain/normalization';

const text = z.string().min(1).refine((value) => value.trim().length > 0, 'Texto vazio.');
const natural = z.number().int().nonnegative();
const timestamp = z.iso.datetime({ offset: true }).refine((value) => !/\s/u.test(value));
const civilDate = z.iso.date();
const version = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/u).refine((value) => !/\s/u.test(value));
const enumeration = z.array(z.number().int().positive()).min(1);

export type DateKey = `${number}-${number}-${number}`;
export type CellKey = `${number}:${number}`;
export const DateKeySchema = z.custom<DateKey>((value) => typeof value === 'string' && value.length === 10 && civilDate.safeParse(value).success, 'Data civil inválida.');
export const CellKeySchema = z.custom<CellKey>((value) =>
  typeof value === 'string' && !/[^0-9:]/u.test(value) && /^(0|[1-9]\d*):(0|[1-9]\d*)$/u.test(value)
  && value.split(':').every((coordinate) => Number.isSafeInteger(Number(coordinate))), 'Coordenada inválida.');
export const DifficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const CategorySchema = z.enum(['vocabulary', 'expressions', 'history', 'geography', 'science', 'literature', 'arts', 'pop_culture', 'music', 'sports', 'other']);
export const ReviewStatusSchema = z.enum(['draft', 'auto_checked', 'editorial_approved', 'rejected']);
export const DirectionSchema = z.enum(['across', 'down']);
export const GameModeSchema = z.enum(['daily', 'free']);
export const SessionStatusSchema = z.enum(['in_progress', 'completed', 'expired_unfinished']);

export const ProvenanceSchema = z.strictObject({
  sourceId: text,
  sourceUrl: z.url({ protocol: /^https?$/u }),
  sourceSnapshot: text,
  licenseId: text,
  attribution: text,
  retrievedAt: timestamp,
  externalId: text.optional(),
});

export const LexiconEntrySchema = z.strictObject({
  entryId: text,
  displayAnswer: text,
  canonicalAnswer: text.refine((value) => !/[^A-Z]/u.test(value), 'Esperadas letras A–Z.'),
  enumeration,
  category: CategorySchema,
  tags: z.array(text),
  estimatedDifficulty: DifficultySchema,
  provenance: z.array(ProvenanceSchema).min(1),
  factualContext: text.optional(),
  editorialStatus: ReviewStatusSchema,
}).superRefine((entry, ctx) => {
  try {
    if (normalizeAnswer(entry.displayAnswer) !== entry.canonicalAnswer) {
      ctx.addIssue({ code: 'custom', path: ['canonicalAnswer'], message: 'Resposta canônica não corresponde à grafia.' });
    }
    const expected = buildEnumeration(entry.displayAnswer);
    if (expected.length !== entry.enumeration.length || expected.some((length, index) => length !== entry.enumeration[index])) {
      ctx.addIssue({ code: 'custom', path: ['enumeration'], message: 'Enumeração não corresponde à grafia.' });
    }
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    ctx.addIssue({ code: 'custom', path: ['displayAnswer'], message: 'Grafia não suportada pelo contrato lexical.' });
  }
});

export const ClueCandidateSchema = z.strictObject({
  clueId: text,
  entryId: text,
  clueText: text,
  difficulty: DifficultySchema,
  clueKind: z.enum(['definition', 'wordplay', 'fact', 'association']),
  evidence: z.array(ProvenanceSchema),
  generator: z.strictObject({ provider: z.enum(['gemini', 'human']), model: text.optional(), promptVersion: text.optional() }).optional(),
  flags: z.array(text),
  review: z.strictObject({ status: ReviewStatusSchema, reviewer: text.optional(), reviewedAt: timestamp.optional(), notes: text.optional() }),
}).superRefine((clue, ctx) => {
  if (clue.clueKind === 'fact' && clue.evidence.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['evidence'], message: 'Pista factual exige evidência.' });
  }
  if (clue.review.status === 'editorial_approved' && (!clue.review.reviewer || !clue.review.reviewedAt)) {
    ctx.addIssue({ code: 'custom', path: ['review'], message: 'Aprovação exige revisor e instante de revisão.' });
  }
});

export const PuzzleEntrySchema = z.strictObject({
  entryId: text,
  clueId: text,
  number: z.number().int().positive(),
  direction: DirectionSchema,
  row: natural,
  col: natural,
  length: z.number().int().min(2),
  clueText: text,
  enumeration,
  category: CategorySchema,
}).refine((entry) => entry.enumeration.reduce((sum, length) => sum + length, 0) === entry.length, { path: ['enumeration'], message: 'Enumeração deve somar o comprimento.' });

// Schema shape only: graph, crossings, source verification and publication
// authorization remain separate gates owned by the later guides.
export const CrosswordPuzzleSchema = z.strictObject({
  schemaVersion: z.literal(1),
  catalogVersion: version,
  puzzleId: text,
  title: text,
  gridRows: z.array(text.refine((row) => !/[^A-Z#]/u.test(row), 'Grade aceita somente A–Z e #.')).min(1),
  entries: z.array(PuzzleEntrySchema).min(1),
  reviewer: text,
  reviewedAt: timestamp,
  editorialStatus: z.literal('editorial_approved'),
}).refine((puzzle) => puzzle.gridRows.every((row) => row.length === puzzle.gridRows[0]?.length), { path: ['gridRows'], message: 'Grade deve ser retangular.' });

export const ManifestPuzzleRefSchema = z.strictObject({
  puzzleId: text,
  path: text.refine((value) =>
    value.startsWith('/catalog/') && value.endsWith('.json') && !/[^A-Za-z0-9/._-]/u.test(value)
    && value.slice('/catalog/'.length).split('/').every((part) => part.length > 0 && part !== '.' && part !== '..'), 'Caminho de catálogo inválido.'),
  sha256: z.string().length(64).refine((value) => !/[^a-fA-F0-9]/u.test(value), 'SHA-256 inválido.'),
});

export const CatalogManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  catalogVersion: version,
  publishedAt: timestamp,
  timezone: z.literal('America/Recife'),
  daily: z.record(DateKeySchema, ManifestPuzzleRefSchema),
  free: z.array(ManifestPuzzleRefSchema),
  attributionPath: z.literal('/catalog/ATTRIBUTION.md'),
});

export const GameSessionSchema = z.strictObject({
  sessionId: text,
  puzzleId: text,
  catalogVersion: version,
  mode: GameModeSchema,
  dateKey: DateKeySchema.optional(),
  status: SessionStatusSchema,
  lettersByCell: z.record(CellKeySchema, z.string().length(1).refine((value) => !/[^A-Z]/u.test(value))),
  activeCell: CellKeySchema.nullable(),
  activeDirection: DirectionSchema,
  activeSeconds: natural,
  assistsUsed: natural,
  checksUsed: natural,
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp.optional(),
  revision: natural,
}).superRefine((session, ctx) => {
  if ((session.mode === 'daily' && !session.dateKey) || (session.mode === 'free' && 'dateKey' in session)) {
    ctx.addIssue({ code: 'custom', path: ['dateKey'], message: 'Data obrigatória no diário e ausente no livre.' });
  }
  if ((session.status === 'completed') !== (session.completedAt !== undefined)) {
    ctx.addIssue({ code: 'custom', path: ['completedAt'], message: 'Instante de conclusão obrigatório somente na sessão concluída.' });
  }
});

export const DailyCompletionSchema = z.strictObject({
  dateKey: DateKeySchema,
  puzzleId: text,
  sessionId: text,
  completedAt: timestamp,
  assisted: z.boolean(),
  activeSeconds: natural,
});

export const PersistedStateV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  dailyCompletions: z.array(DailyCompletionSchema),
  sessions: z.record(text, GameSessionSchema),
  activeFreeSessionId: text.optional(),
  recentFreePuzzleIds: z.array(text),
  bestStreak: natural,
  lastMigrationAt: timestamp.optional(),
}).superRefine((state, ctx) => {
  for (const [key, session] of Object.entries(state.sessions)) {
    if (key !== session.sessionId) ctx.addIssue({ code: 'custom', path: ['sessions', key, 'sessionId'], message: 'Chave deve corresponder ao sessionId.' });
  }
  if (state.activeFreeSessionId && state.sessions[state.activeFreeSessionId]?.mode !== 'free') {
    ctx.addIssue({ code: 'custom', path: ['activeFreeSessionId'], message: 'Sessão livre ativa deve referenciar uma sessão livre existente.' });
  }
});

export type Difficulty = z.infer<typeof DifficultySchema>;
export type Category = z.infer<typeof CategorySchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type Direction = z.infer<typeof DirectionSchema>;
export type GameMode = z.infer<typeof GameModeSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type LexiconEntry = z.infer<typeof LexiconEntrySchema>;
export type ClueCandidate = z.infer<typeof ClueCandidateSchema>;
export type PuzzleEntry = z.infer<typeof PuzzleEntrySchema>;
export type CrosswordPuzzle = z.infer<typeof CrosswordPuzzleSchema>;
export type ManifestPuzzleRef = z.infer<typeof ManifestPuzzleRefSchema>;
export type CatalogManifest = z.infer<typeof CatalogManifestSchema>;
export type GameSession = z.infer<typeof GameSessionSchema>;
export type DailyCompletion = z.infer<typeof DailyCompletionSchema>;
export type PersistedStateV1 = z.infer<typeof PersistedStateV1Schema>;
