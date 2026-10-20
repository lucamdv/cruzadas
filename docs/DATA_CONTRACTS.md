# DATA CONTRACTS — Entrelinhas V1

**ID:** ENT-CONTRACT-001 | **Versão:** 1.0.0 | **Validade:** nomes e estados canônicos para domínio, editorial e UI | **Nota:** interfaces abaixo são CONTRATOS, não implementação existente.

## 1. Princípios

- TS estrito (`strict: true`), validação de todo JSON externo ao entrar em cada fronteira (Zod ou equivalente); não supor que TS valida runtime.
- Distinguem-se: `displayAnswer` (grafia editorial), `canonicalAnswer` (letras da grade), `clueText` (pista), `puzzleId` (puzzle estável), `catalogVersion` (release), `dateKey` (data civil), `sessionId` (tentativa).
- `canonicalAnswer` gerada exclusivamente por `normalizeAnswer`, seguindo regras explícitas; jamais usar `.length` da forma com diacríticos como comprimento da grade.
- Dados externos e Gemini são **untrusted**. Campos editoriais obrigatórios não podem ser inventados no importador. Schema valida formato, mas não valida veracidade de pista.

## 2. Tipos editoriais

```ts
type DateKey = `${number}-${number}-${number}`; // validar YYYY-MM-DD semanticamente

type Difficulty = 1 | 2 | 3;
type Category =
  | 'vocabulary' | 'expressions' | 'history' | 'geography' | 'science'
  | 'literature' | 'arts' | 'pop_culture' | 'music' | 'sports' | 'other';

type ReviewStatus = 'draft' | 'auto_checked' | 'editorial_approved' | 'rejected';

interface Provenance {
  sourceId: string;               // ID em sources manifest, ex.: 'wikidata'
  sourceUrl: string;              // URL estável ou URI de entidade
  sourceSnapshot: string;         // versão/commit/data da extração
  licenseId: string;              // verificado por humano antes da importação
  attribution: string;            // texto conforme licença aplicável
  retrievedAt: string;            // ISO 8601
  externalId?: string;            // ex.: 'Q...' do Wikidata
}

interface LexiconEntry {
  entryId: string;                // ID estável do conceito + grafia
  displayAnswer: string;          // ex.: 'São Paulo'
  canonicalAnswer: string;        // 'SAOPAULO'
  enumeration: number[];          // [3, 5], baseada em grupos da grafia editorial
  category: Category;
  tags: string[];
  estimatedDifficulty: Difficulty;
  provenance: Provenance[];      // >= 1; licença aprovada
  factualContext?: string;       // contexto verificável, não script
  editorialStatus: ReviewStatus;
}

interface ClueCandidate {
  clueId: string;
  entryId: string;
  clueText: string;               // não contém resposta normalizada
  difficulty: Difficulty;
  clueKind: 'definition' | 'wordplay' | 'fact' | 'association';
  evidence: Provenance[];         // requerido para pista factual
  generator?: { provider: 'gemini' | 'human'; model?: string; promptVersion?: string };
  flags: string[];                // ambiguidade, referência temporal, etc.
  review: { status: ReviewStatus; reviewer?: string; reviewedAt?: string; notes?: string };
}
```

### 2.1 Normalização

`normalizeAnswer('Coração') === 'CORACAO'`;
`normalizeAnswer('São Paulo') === 'SAOPAULO'`;
`normalizeAnswer('água-de-coco') === 'AGUADECOCO'`.

Use decomposição Unicode e mapeamento explícito de `Ç`, remoção de diacríticos e separadores permitidos, uppercase. Não aceitar números, emojis, caracteres desconhecidos ou forma normalizada vazia. Pistas podem conter aspas e pontuação; **não** usar resultado de `normalizeAnswer` no texto público de pista (é para validação anti-vazamento). Enumeração calculada dos segmentos originais separados por espaço/hífen, ignorando pontuação externa; se variantes gerarem ambiguidade, revisão manual.

## 3. Puzzle público e manifest

```ts
type Direction = 'across' | 'down';
type CellKey = `${number}:${number}`; // row:col, índices 0-based

interface PuzzleEntry {
  entryId: string;             // identifica entrada lexical
  clueId: string;              // identifica pista editorial aprovada
  number: number;              // 1-based, números únicos por posição de início
  direction: Direction;
  row: number;                 // início 0-based
  col: number;
  length: number;
  clueText: string;            // visível; jamais conter a resposta
  enumeration: number[];
  category: Category;
}

interface CrosswordPuzzle {
  schemaVersion: 1;
  catalogVersion: string;      // semver do catálogo, ex.: '1.0.0'
  puzzleId: string;            // estável; sha de layout e pistas aprovadas
  title: string;
  gridRows: string[];          // '#' para bloco, 'A'..'Z' para solução
  entries: PuzzleEntry[];
  reviewer: string;            // identificação editorial (não dado pessoal da jogadora)
  reviewedAt: string;          // ISO 8601
  editorialStatus: 'editorial_approved';
}

interface ManifestPuzzleRef {
  puzzleId: string;
  path: string;                // relativo público: '/catalog/...json'
  sha256: string;              // hash dos bytes do arquivo do puzzle
}

interface CatalogManifest {
  schemaVersion: 1;
  catalogVersion: string;
  publishedAt: string;
  timezone: 'America/Recife';
  daily: Record<DateKey, ManifestPuzzleRef>;
  free: ManifestPuzzleRef[];
  attributionPath: '/catalog/ATTRIBUTION.md';
}
```

Invariantes: `gridRows` retangular, pelo menos uma entrada horizontal e uma vertical; número/palavra e coordenadas coerentes; referências a pistas/soluções válidas; `puzzleId` único; hash verificado na pipeline; nada publicado sem aprovação. Uma entrada responde a uma única sequência de letras da grade. Mesmo que a solução seja inspecionável no navegador, **nunca** deixar o jogo oferecer pistas ou respostas sem ação do jogador.

Para compatibilidade histórica: `catalogVersion` cresce; `puzzleId` e mapeamento de uma `dateKey` já publicada são **imutáveis** entre versões. Se o puzzle corrigido precisa trocar o ID, é uma migração editorial explícita com UX de reconciliação, não overwrite silencioso.

## 4. Sessão e armazenamento

```ts
type GameMode = 'daily' | 'free';
type SessionStatus = 'in_progress' | 'completed' | 'expired_unfinished';

interface GameSession {
  sessionId: string;
  puzzleId: string;
  catalogVersion: string;
  mode: GameMode;
  dateKey?: DateKey;           // obrigatório se mode === 'daily'; ausente se free
  status: SessionStatus;
  lettersByCell: Record<CellKey, string>; // 'A'..'Z' ou sem propriedade
  activeCell: CellKey | null;
  activeDirection: Direction;
  activeSeconds: number;      // inteiro >= 0, congelado ao salvar
  assistsUsed: number;
  checksUsed: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  revision: number;
}

interface DailyCompletion {
  dateKey: DateKey;
  puzzleId: string;
  sessionId: string;
  completedAt: string;
  assisted: boolean;
  activeSeconds: number;
}

interface PersistedStateV1 {
  schemaVersion: 1;
  dailyCompletions: DailyCompletion[];
  sessions: Record<string, GameSession>; // chave sessionId
  activeFreeSessionId?: string;
  recentFreePuzzleIds: string[];
  bestStreak: number;          // derivável; reconciliação recalcula máximo
  lastMigrationAt?: string;
}
```

Chave única sugerida `entrelinhas:state:v1`. Escritas versionadas e leitura defensiva (array não confiável, números não negativos, datas canônicas, quantidade de dados com limites). Guardar sessões suficientes para retomar último diário/livre; limitar retenção de sessões antigas por política explicitada no código, **nunca** remover conclusões diárias para economizar espaço. `bestStreak` deriva do histórico completo. Concluir pela segunda vez a mesma data → o mesmo resultado (idempotência).

## 5. Interfaces puras do domínio

Assinaturas sugeridas para começar. Mudanças de nome exigem atualização conjunta de guia, testes e docs.

```ts
export function normalizeAnswer(displayAnswer: string): string;
export function buildEnumeration(displayAnswer: string): number[];
export function validatePuzzle(puzzle: CrosswordPuzzle): ValidationResult;
export function getRecifeDateKey(instant: Date): DateKey;
export function addCivilDays(dateKey: DateKey, offset: number): DateKey;
export function calculateStreak(completions: DailyCompletion[], today: DateKey): {
  current: number; best: number; lastCompleted?: DateKey;
};
export function canCompleteDaily(sessionDate: DateKey, today: DateKey): boolean;
export function selectFreePuzzle(
  available: ManifestPuzzleRef[], recentIds: string[], seed: number
): { puzzle: ManifestPuzzleRef; repeated: boolean } | null;
export function applyLetter(
  session: GameSession, cell: CellKey, input: string
): GameSession;
export function checkSolved(puzzle: CrosswordPuzzle, session: GameSession): boolean;
```

`ValidationResult` tem `ok: boolean`, `errors: Array<{code:string; message:string; location?:string}>`, `metrics:{ checkedCellRate:number; wordsAcross:number; wordsDown:number; connectedComponents:number }`. Não retornar somente boolean; relatórios editoriais precisam explicar por que rejeitaram.

## 6. Porta editorial substituível

```ts
interface ClueRequest {
  entry: LexiconEntry;
  count: number;             // V1 padrão 3
  style: 'classic_br';
  promptVersion: string;
}
interface ClueProvider {
  generateCandidates(requests: ClueRequest[]): Promise<ClueCandidate[]>;
}
```

`GeminiClueProvider` implementa em `scripts/editorial/clues/*`, fora do bundle React, e usa o SDK oficial server-side com output estruturado + validação de schema e fatos. `MockClueProvider` serve a testes sem rede e não publica pistas `editorial_approved`. Pistas só são associadas à grade pelo publisher após revisão editorial.

## 7. Exemplo de manifest (apenas formato ilustrativo)

```json
{
  "schemaVersion": 1,
  "catalogVersion": "1.0.0",
  "publishedAt": "2026-10-20T12:00:00-03:00",
  "timezone": "America/Recife",
  "daily": {},
  "free": [],
  "attributionPath": "/catalog/ATTRIBUTION.md"
}
```

**IMPORTANTE:** o exemplo é schema, não lançamento válido; `daily: {}` e `free: []` falham no gate de release. Testes e fixtures podem começar vazios; não devem ser confundidos com catálogo publicável.

## 8. Falhas tipadas

- `CatalogNotFound`, `SchemaMismatch`, `PuzzleInvalid`, `StorageUnavailable`, `StorageQuotaExceeded`, `DailyExpired`, `DailyNotPublished`, `EditorialLicenseMissing`, `EditorialApprovalMissing`, `GeminiUnavailable`, `GenerationQualityRejected`.
- Não usar `catch { return defaultPuzzle; }` ou trocar puzzle sem avisar. Em operação cotidiana, apresentar UI de recuperação honesta, não crash.
