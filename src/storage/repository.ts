import { GameSessionSchema, type GameSession, type PersistedStateV1 } from '../content/schemas';
import type { PreviewPuzzle } from '../domain/preview-types';
import { activeEntry, checkSolved, createGameSession } from '../domain/session';
import { migrateState } from './migrations';
export const STORAGE_KEY = 'entrelinhas:state:v1';
// UTF-16 storage budget, including keys and values inside the one JSON blob.
const MAX_STATE_BYTES = 2 * 1024 * 1024;
const MEMORY_NOTICE = 'Progresso somente em memória. Recarregar ou fechar a página perde as alterações desta sessão.';
const emptyState = (): PersistedStateV1 => ({ schemaVersion: 1, sessions: {}, dailyCompletions: [], recentFreePuzzleIds: [], bestStreak: 0 });
// Compare validated structures, not JSON property insertion order or timestamps.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}
const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
function sameContent(a: GameSession | null, b: GameSession | null) {
  if (!a || !b) return a === b;
  const content = (s: GameSession) => ({ ...s, activeSeconds: 0, revision: 0, updatedAt: '' });
  return equal(content(a), content(b));
}
export function sessionMatchesPuzzle(session: GameSession, puzzle: PreviewPuzzle): boolean {
  if (!GameSessionSchema.safeParse(session).success || session.puzzleId !== puzzle.puzzleId || session.catalogVersion !== puzzle.catalogVersion || session.mode !== 'free') return false;
  const white = (key: string) => { const [r, c] = key.split(':').map(Number); const letter = puzzle.gridRows[r!]?.[c!]; return letter !== undefined && letter !== '#'; };
  return Object.keys(session.lettersByCell).every(white)
    && (session.activeCell === null || (white(session.activeCell) && activeEntry(puzzle, session) !== undefined))
    && (session.status !== 'completed' || checkSolved(puzzle, session));
}
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface LockPort { request<T>(name: string, callback: () => T | Promise<T>): Promise<T> }
export interface RepositoryOptions { storage?: StoragePort; locks?: LockPort | null; events?: EventTarget }
export interface SessionConflict { local: GameSession; remote: GameSession | null }

export class GameRepository {
  session: GameSession;
  notice = '';
  readonly conflicts: SessionConflict[] = [];
  private readonly puzzle: PreviewPuzzle;
  private storage?: StoragePort;
  private readonly locks?: LockPort | null;
  private readonly events?: EventTarget;
  private baseState = emptyState();
  private baseSession: GameSession | null = null;
  private protected = false;
  private listeners = new Set<() => void>();
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;
  private choiceGeneration = 0;
  private pendingRestart?: Promise<GameSession>;

  constructor(puzzle: PreviewPuzzle, options?: RepositoryOptions) {
    this.puzzle = puzzle;
    this.session = createGameSession(puzzle, crypto.randomUUID(), new Date().toISOString());
    this.locks = options ? options.locks : typeof navigator !== 'undefined' ? navigator.locks : undefined;
    this.events = options?.events ?? (typeof window !== 'undefined' ? window : undefined);
    try {
      this.storage = options ? options.storage : window.localStorage;
      this.baseState = this.loadState();
      const id = this.baseState.activeFreeSessionId;
      const restored = id ? this.baseState.sessions[id] : undefined;
      if (restored) {
        if (!sessionMatchesPuzzle(restored, puzzle)) throw new Error('A partida salva pertence a outra versão ou contém casas incompatíveis.');
        this.session = restored;
        this.baseSession = restored;
      }
    } catch { this.fallback('Os dados salvos não puderam ser retomados.'); }
    if (!this.storage || !this.locks) this.fallback('O salvamento seguro não está disponível neste navegador.');
  }

  get persistent() { return !this.protected; }
  get hasUnsavedChanges() { return this.persistent && !equal(this.session, this.baseSession); }
  private emit() { for (const listener of this.listeners) listener(); }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private fallback(reason: string) { this.protected = true; this.notice = `${reason} ${MEMORY_NOTICE}`; }
  private conflict(remote: GameSession | null) {
    this.conflicts.push({ local: structuredClone(this.session), remote: remote ? structuredClone(remote) : null });
    this.fallback('Esta partida mudou em outra aba. As duas versões foram preservadas nesta página; o registro da outra aba não será substituído.');
    this.emit();
  }

  loadState(): PersistedStateV1 {
    const raw = this.storage?.getItem(STORAGE_KEY) ?? null;
    if (raw === null) return emptyState();
    if (raw.length * 2 > MAX_STATE_BYTES) throw new Error('Storage size limit');
    const result = migrateState(JSON.parse(raw) as unknown);
    if (!result.ok) throw new Error('Unsupported or corrupt state');
    return result.state;
  }

  saveSession(next: GameSession): Promise<void> {
    // An old component may flush its clock while a restart is being committed.
    if (next.sessionId !== this.session.sessionId) return Promise.resolve();
    if (!sessionMatchesPuzzle(next, this.puzzle)) {
      this.fallback('A partida não corresponde aos dados desta grade.'); this.emit(); return Promise.resolve();
    }
    const wasDirty = this.hasUnsavedChanges;
    this.session = next;
    if (wasDirty !== this.hasUnsavedChanges) this.emit();
    return this.enqueue(next, false);
  }

  private enqueue(next: GameSession, restart: boolean): Promise<void> {
    const generation = this.generation;
    const choiceGeneration = this.choiceGeneration;
    const enqueuedBase = this.baseSession;
    // An automatic remote adoption can rebase a queued clock, but never a
    // captured user edit or an operation preceding an explicit recovery choice.
    const eligible = () => generation === this.generation || (!restart && choiceGeneration === this.choiceGeneration && sameContent(next, enqueuedBase) && this.session.sessionId === next.sessionId);
    this.queue = this.queue.then(async () => {
      if (this.protected || !this.locks || !eligible()) return;
      try {
        await this.locks.request(STORAGE_KEY, () => {
          if (this.protected || !eligible()) return;
          const latest = this.loadState();
          const previousId = this.baseState.activeFreeSessionId;
          const remote = previousId ? latest.sessions[previousId] ?? null : null;
          if (latest.activeFreeSessionId !== previousId) { this.conflict(remote); return; }
          if (remote && !sessionMatchesPuzzle(remote, this.puzzle)) { this.conflict(remote); return; }
          let candidate = generation === this.generation ? next : this.session;
          let adopted = false;
          if (!equal(remote, this.baseSession)) {
            if (!restart && remote && this.baseSession && (sameContent(remote, this.baseSession) || sameContent(candidate, this.baseSession))) {
              if (sameContent(candidate, this.baseSession) && !sameContent(remote, this.baseSession)) {
                if (!sameContent(this.session, this.baseSession)) { this.conflict(remote); return; }
                candidate = remote;
                adopted = true;
              }
              const activeSeconds = Math.max(remote.activeSeconds, next.activeSeconds, adopted ? this.session.activeSeconds : 0);
              candidate = { ...candidate, activeSeconds, revision: Math.max(candidate.revision, remote.revision) + (equal(candidate, remote) && activeSeconds === remote.activeSeconds ? 0 : 1) };
            } else if (!equal(remote, candidate)) { this.conflict(remote); return; }
          }
          const existing = latest.sessions[candidate.sessionId];
          // Never replace completion through a delayed clock/edit snapshot.
          if (existing?.status === 'completed' && !equal(existing, candidate)) { this.conflict(existing); return; }
          if (existing && existing.status !== 'completed' && candidate.activeSeconds < existing.activeSeconds) {
            candidate = { ...candidate, activeSeconds: existing.activeSeconds, revision: Math.max(candidate.revision, existing.revision) + 1 };
          }
          const merged = { ...latest, sessions: { ...latest.sessions, [candidate.sessionId]: candidate }, activeFreeSessionId: candidate.sessionId };
          const parsed = migrateState(merged);
          if (!parsed.ok) throw new Error('Invalid write');
          const raw = JSON.stringify(parsed.state);
          if (raw.length * 2 > MAX_STATE_BYTES) throw new Error('Storage size limit');
          if (!equal(latest, parsed.state)) this.storage!.setItem(STORAGE_KEY, raw);
          this.baseState = parsed.state;
          this.baseSession = candidate;
          if (adopted) this.generation++;
          if (adopted || (this.session === next && !equal(candidate, next))) { this.session = candidate; this.emit(); }
          // A status may become "saved" only after the current head is covered
          // by the successful write, including all pending newer snapshots.
          this.emit();
          // A queued restart establishes its own base without touching other records.
          if (restart) this.emit();
        });
      } catch { this.fallback('Não foi possível salvar neste dispositivo (armazenamento bloqueado ou cheio).'); this.emit(); }
    });
    return this.queue;
  }

  restart(): Promise<GameSession> {
    if (this.pendingRestart) return this.pendingRestart;
    const choiceGeneration = this.choiceGeneration;
    this.pendingRestart = (async () => {
      await this.queue;
      if (choiceGeneration !== this.choiceGeneration) return this.session;
      const next = createGameSession(this.puzzle, crypto.randomUUID(), new Date().toISOString());
      this.session = next;
      this.emit();
      await this.enqueue(next, true);
      if (choiceGeneration !== this.choiceGeneration) return this.session;
      this.emit();
      return next;
    })().finally(() => { this.pendingRestart = undefined; });
    return this.pendingRestart;
  }

  useSavedSession(): void {
    try {
      const latest = this.loadState(), id = latest.activeFreeSessionId, saved = id ? latest.sessions[id] : undefined;
      if (!saved || !sessionMatchesPuzzle(saved, this.puzzle) || !this.locks) throw new Error('Incompatible saved session');
      this.conflicts.push({ local: structuredClone(this.session), remote: structuredClone(saved) });
      this.generation++;
      this.choiceGeneration++;
      this.session = saved; this.baseSession = saved; this.baseState = latest;
      this.protected = false; this.notice = ''; this.emit();
    } catch { this.fallback('A partida salva não pode ser retomada com esta grade.'); this.emit(); }
  }

  connect(beforeLeave?: () => void): () => void {
    const beforeUnload = (event: Event) => {
      // pagehide is too late to ask the user to wait for an active clock flush.
      beforeLeave?.();
      if (!this.hasUnsavedChanges) return;
      event.preventDefault();
      (event as BeforeUnloadEvent).returnValue = '';
    };
    const handler = (event: Event) => {
      const key = (event as StorageEvent).key;
      if (key !== STORAGE_KEY && key !== null) return;
      if (this.protected) return;
      try {
        const latest = this.loadState(), id = this.baseState.activeFreeSessionId;
        const remote = id ? latest.sessions[id] ?? null : null;
        if (latest.activeFreeSessionId !== id) { this.conflict(remote); return; }
        if (equal(remote, this.baseSession)) { this.baseState = latest; return; }
        if (!remote || !sessionMatchesPuzzle(remote, this.puzzle)
          || (!equal(this.session, this.baseSession) && !sameContent(this.session, this.baseSession))
          || (remote.revision <= (this.baseSession?.revision ?? -1) && !sameContent(remote, this.baseSession))
          || (this.session.status === 'completed' && remote.status !== 'completed')) { this.conflict(remote); return; }
        // Captured writes from before this event belong to an obsolete base.
        // The next local tick/edit starts from the adopted session instead.
        this.generation++;
        this.baseState = latest; this.baseSession = remote;
        this.session = remote.status === 'completed' || remote.activeSeconds >= this.session.activeSeconds ? remote : { ...remote, activeSeconds: this.session.activeSeconds };
        this.emit();
      } catch { this.fallback('Os dados salvos mudaram e não puderam ser lidos.'); this.emit(); }
    };
    this.events?.addEventListener('storage', handler);
    this.events?.addEventListener('beforeunload', beforeUnload);
    return () => { this.events?.removeEventListener('storage', handler); this.events?.removeEventListener('beforeunload', beforeUnload); };
  }
}
