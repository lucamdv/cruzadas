import { describe, expect, it } from 'vitest';
import { createGameSession, applyLetter, checkWord, finishSession, revealLetter, selectCell } from '../../src/domain/session';
import type { PersistedStateV1 } from '../../src/content/schemas';
import { GameRepository, STORAGE_KEY } from '../../src/storage/repository';
import { migrateState } from '../../src/storage/migrations';
import { previewFixture } from '../helpers/play-preview-fixture';

const at = '2026-10-25T15:00:00.000Z';
const puzzle = previewFixture();
const session = () => createGameSession(puzzle, 'session-a', at);
const state = (): PersistedStateV1 => ({ schemaVersion: 1, sessions: { 'session-a': session() }, activeFreeSessionId: 'session-a', dailyCompletions: [], recentFreePuzzleIds: ['other-puzzle'], bestStreak: 0 });
class Store {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}
// Same exclusion contract as Web Locks; deterministic queue, no fake repository.
function locks() {
  let queue = Promise.resolve();
  return { request: <T,>(_name: string, callback: () => T | Promise<T>): Promise<T> => {
    const next = queue.then(callback); queue = next.then(() => undefined, () => undefined); return next;
  } };
}
function setup(initial: unknown = state(), lock = locks()) {
  const storage = new Store();
  if (initial !== null) storage.setItem(STORAGE_KEY, typeof initial === 'string' ? initial : JSON.stringify(initial));
  const events = new EventTarget();
  return { storage, events, lock, repo: new GameRepository(puzzle, { storage, locks: lock, events }) };
}
const read = (storage: Store) => JSON.parse(storage.getItem(STORAGE_KEY)!) as PersistedStateV1;

describe('versioned storage boundary', () => {
  it('dispatches V1 idempotently without inventing migrations', () => {
    expect(migrateState(state())).toEqual({ ok: true, state: state() });
    expect(migrateState({ ...state(), schemaVersion: 2 }).ok).toBe(false);
    expect(migrateState({ ...state(), unexpected: true }).ok).toBe(false);
    expect(migrateState({ ...state(), bestStreak: '0' }).ok).toBe(false);
  });
  it.each(['{broken', JSON.stringify({ schemaVersion: 99 }), 'x'.repeat(1_048_577)])('preserves an unreadable original blob', async raw => {
    const { repo, storage } = setup(raw);
    await repo.saveSession(applyLetter(repo.session, '3:3', 'A', at));
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    expect(repo.notice).toMatch(/memória/i);
    expect(repo.session.lettersByCell['3:3']).toBe('A');
  });
  it('survives denied reads and quota writes with an explicit memory warning', async () => {
    const denied = new GameRepository(puzzle, { storage: { getItem() { throw new DOMException('denied', 'SecurityError'); }, setItem() { throw new Error('must not write'); } }, locks: locks() });
    expect(denied.notice).toMatch(/memória/i);
    const { repo, storage } = setup();
    storage.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    await repo.saveSession(applyLetter(repo.session, '3:3', 'A', at));
    expect(repo.session.lettersByCell['3:3']).toBe('A');
    expect(read(storage).sessions['session-a']!.lettersByCell).toEqual({});
    expect(repo.notice).toMatch(/memória/i);
  });
  it('uses conservative memory mode without cross-tab locking', async () => {
    const storage = new Store();
    const repo = new GameRepository(puzzle, { storage, locks: null });
    await repo.saveSession(applyLetter(repo.session, '3:3', 'A', at));
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(repo.notice).toMatch(/memória/i);
  });
  it.each(['identity', 'catalog', 'blocked-letter', 'blocked-selection', 'false-completed'])('rejects incompatible restored sessions (%s) and protects the original', async kind => {
    const initial = state(), s = initial.sessions['session-a']!;
    if (kind === 'identity') s.puzzleId = 'old-puzzle';
    if (kind === 'catalog') s.catalogVersion = '99.0.0';
    if (kind === 'blocked-letter') s.lettersByCell['0:0'] = 'A';
    if (kind === 'blocked-selection') s.activeCell = '0:0';
    if (kind === 'false-completed') { s.status = 'completed'; s.completedAt = at; }
    const { repo, storage } = setup(initial), raw = storage.getItem(STORAGE_KEY);
    expect(repo.session.sessionId).not.toBe('session-a');
    expect(repo.notice).toMatch(/memória/i);
    await repo.saveSession(repo.session);
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });
});

describe('session persistence and reconciliation', () => {
  it('restores letters, selection, direction, clock, checks, assists and exact identities', async () => {
    const { repo, storage, lock } = setup();
    const s = { ...checkWord(revealLetter(selectCell(repo.session, puzzle, '3:3', true, at), puzzle, at), puzzle, at).session, activeSeconds: 73 };
    await repo.saveSession(s);
    const reloaded = new GameRepository(puzzle, { storage, locks: lock });
    expect(reloaded.session).toEqual(s);
    expect(reloaded.session).toMatchObject({ sessionId: 'session-a', activeCell: '3:3', activeDirection: 'down', activeSeconds: 73, checksUsed: 1, assistsUsed: 1, lettersByCell: { '3:3': 'Z' } });
  });
  it('persists completion idempotently, preserving unrelated records and canonical history', async () => {
    const { repo, storage } = setup();
    const lettersByCell = Object.fromEntries(puzzle.gridRows.flatMap((row, r) => [...row].flatMap((letter, c) => letter === '#' ? [] : [[`${r}:${c}`, letter]])));
    const done = finishSession({ ...repo.session, lettersByCell }, puzzle, at);
    await repo.saveSession(done); const raw = storage.getItem(STORAGE_KEY);
    await repo.saveSession(done);
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    expect(read(storage)).toMatchObject({ dailyCompletions: [], bestStreak: 0, recentFreePuzzleIds: ['other-puzzle'] });
    expect(new GameRepository(puzzle, { storage, locks: locks() }).session.status).toBe('completed');
  });
  it('restarts with a new identity and pointer, preserving previous sessions and all other storage keys', async () => {
    const { repo, storage } = setup(); storage.setItem('unrelated', 'keep');
    await repo.saveSession(applyLetter(repo.session, '3:3', 'Z', at));
    const next = await repo.restart();
    expect(next.sessionId).not.toBe('session-a');
    expect(next.lettersByCell).toEqual({});
    const stored = read(storage);
    expect(stored.activeFreeSessionId).toBe(next.sessionId);
    expect(stored.sessions['session-a']!.lettersByCell).toEqual({ '3:3': 'Z' });
    expect(stored.recentFreePuzzleIds).toEqual(['other-puzzle']);
    expect(storage.getItem('unrelated')).toBe('keep');
  });
  it('merges the latest unrelated sessions instead of saving a stale whole state', async () => {
    const { repo, storage } = setup();
    const remote = read(storage); remote.sessions.other = { ...session(), sessionId: 'other' }; remote.bestStreak = 8;
    storage.setItem(STORAGE_KEY, JSON.stringify(remote));
    await repo.saveSession(applyLetter(repo.session, '3:3', 'Z', at));
    expect(read(storage).sessions.other?.sessionId).toBe('other');
    expect(read(storage).bestStreak).toBe(8);
  });
  it('protects divergent concurrent writes and both snapshots without timestamp arbitration', async () => {
    const { repo: a, storage, lock } = setup(); const b = new GameRepository(puzzle, { storage, locks: lock });
    await Promise.all([a.saveSession(applyLetter(a.session, '3:3', 'Z', at)), b.saveSession(applyLetter(b.session, '3:3', 'A', '2026-10-26T15:00:00.000Z'))]);
    expect(read(storage).sessions['session-a']!.lettersByCell['3:3']).toBe('Z');
    expect(b.session.lettersByCell['3:3']).toBe('A');
    expect(b.conflicts).toHaveLength(1);
    expect(b.notice).toMatch(/outra aba/i);
  });
  it('adopts a clean higher revision on storage event but protects equal-revision divergence', async () => {
    const { repo, events, storage } = setup(); const disconnect = repo.connect();
    const remote = state(); remote.sessions['session-a'] = applyLetter(session(), '3:3', 'Z', at);
    storage.setItem(STORAGE_KEY, JSON.stringify(remote)); events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(repo.session.lettersByCell['3:3']).toBe('Z');
    remote.sessions['session-a']!.lettersByCell['3:3'] = 'A';
    storage.setItem(STORAGE_KEY, JSON.stringify(remote)); events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(repo.session.lettersByCell['3:3']).toBe('Z');
    expect(repo.notice).toMatch(/outra aba/i);
    await repo.saveSession({ ...repo.session, activeSeconds: 10, revision: 3 });
    expect(read(storage).sessions['session-a']!.lettersByCell['3:3']).toBe('A');
    disconnect();
  });
  it('protects against stale completed writes and remote restarts', async () => {
    const { repo, storage, events } = setup(); const disconnect = repo.connect();
    const remote = state(); remote.sessions.new = { ...session(), sessionId: 'new' }; remote.activeFreeSessionId = 'new';
    storage.setItem(STORAGE_KEY, JSON.stringify(remote)); events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    await repo.saveSession(applyLetter(repo.session, '3:3', 'Z', at));
    expect(read(storage).activeFreeSessionId).toBe('new'); expect(repo.notice).toMatch(/outra aba/i);
    disconnect();
  });
  it('does not turn simultaneous clock ticks into edit conflicts or add their durations', async () => {
    const { repo: a, storage, lock, events } = setup();
    const b = new GameRepository(puzzle, { storage, locks: lock, events });
    const disconnectA = a.connect(), disconnectB = b.connect();
    await Promise.all([a.saveSession({ ...a.session, activeSeconds: 2, revision: 1 }), b.saveSession({ ...b.session, activeSeconds: 2, revision: 1 })]);
    events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(a.notice).toBe(''); expect(b.notice).toBe('');
    expect(read(storage).sessions['session-a']!.activeSeconds).toBe(2);
    await b.saveSession({ ...b.session, activeSeconds: 3, revision: 2 });
    events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(a.session.activeSeconds).toBe(3); expect(a.notice).toBe('');
    disconnectA(); disconnectB();
  });
  it('merges a clock-only remote change with a pending real edit without losing either', async () => {
    const { repo: a, storage, lock } = setup();
    const b = new GameRepository(puzzle, { storage, locks: lock });
    await a.saveSession({ ...a.session, activeSeconds: 20, revision: 1 });
    await b.saveSession(applyLetter(b.session, '3:3', 'Z', at));
    expect(read(storage).sessions['session-a']).toMatchObject({ lettersByCell: { '3:3': 'Z' }, activeSeconds: 20 });
    expect(b.notice).toBe('');
  });
  it('never replaces a completed session with a higher-revision stale draft', async () => {
    const { repo, storage, events } = setup();
    const lettersByCell = Object.fromEntries(puzzle.gridRows.flatMap((row, r) => [...row].flatMap((letter, c) => letter === '#' ? [] : [[`${r}:${c}`, letter]])));
    await repo.saveSession(finishSession({ ...repo.session, lettersByCell }, puzzle, at));
    const disconnect = repo.connect(), remote = read(storage);
    remote.sessions['session-a'] = { ...session(), revision: 100 };
    storage.setItem(STORAGE_KEY, JSON.stringify(remote)); events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(repo.session.status).toBe('completed'); expect(repo.notice).toMatch(/outra aba/i);
    disconnect();
  });
  it('ignores late callbacks from a restarted component without disabling the new session', async () => {
    const { repo, storage } = setup(); const old = repo.session;
    const next = await repo.restart();
    await repo.saveSession({ ...old, activeSeconds: 8, revision: 1 });
    await repo.saveSession(applyLetter(next, '3:3', 'Z', at));
    expect(repo.notice).toBe(''); expect(read(storage).sessions[next.sessionId]!.lettersByCell).toEqual({ '3:3': 'Z' });
  });
  it('offers an explicit return to the saved version while retaining the local conflict snapshot', async () => {
    const { repo: a, storage, lock } = setup(); const b = new GameRepository(puzzle, { storage, locks: lock });
    await a.saveSession(applyLetter(a.session, '3:3', 'Z', at));
    await b.saveSession(applyLetter(b.session, '3:3', 'A', at));
    b.useSavedSession();
    expect(b.session.lettersByCell['3:3']).toBe('Z'); expect(b.notice).toBe('');
    expect(b.conflicts.some(c => c.local.lettersByCell['3:3'] === 'A')).toBe(true);
    await b.saveSession(applyLetter(b.session, '3:4', 'Y', at));
    expect(read(storage).sessions['session-a']!.lettersByCell).toEqual({ '3:3': 'Z', '3:4': 'Y' });
  });
  it('freezes the remote completed clock even if the local draft ran longer', async () => {
    const { repo, storage, events } = setup();
    const disconnect = repo.connect();
    const remote = state(), lettersByCell = Object.fromEntries(puzzle.gridRows.flatMap((row, r) => [...row].flatMap((letter, c) => letter === '#' ? [] : [[`${r}:${c}`, letter]])));
    await repo.saveSession({ ...repo.session, activeSeconds: 50, revision: 1 });
    remote.sessions['session-a'] = finishSession({ ...session(), lettersByCell, activeSeconds: 20, revision: 2 }, puzzle, at);
    storage.setItem(STORAGE_KEY, JSON.stringify(remote)); events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(repo.session.status).toBe('completed'); expect(repo.session.activeSeconds).toBe(20);
    disconnect();
  });
  it('keeps saved records intact if a valid new write exceeds the explicit size budget', async () => {
    const initial = state();
    initial.recentFreePuzzleIds = [''];
    initial.recentFreePuzzleIds = ['x'.repeat(1_048_550 - JSON.stringify(initial).length)];
    const { repo, storage } = setup(initial), raw = storage.getItem(STORAGE_KEY);
    await repo.saveSession(repo.session);
    await repo.restart();
    expect(storage.getItem(STORAGE_KEY) === raw).toBe(true);
    expect(repo.notice).toMatch(/memória/i);
  });
  it('invalidates queued edits when the user explicitly chooses the saved version', async () => {
    const { repo, storage, events, lock } = setup(); const disconnect = repo.connect();
    let release!: () => void;
    const held = lock.request(STORAGE_KEY, () => new Promise<void>(resolve => { release = resolve; }));
    await Promise.resolve();
    const pending = repo.saveSession(applyLetter(repo.session, '3:3', 'A', at));
    const remote = state(); remote.sessions['session-a'] = applyLetter(session(), '3:3', 'Z', at);
    storage.setItem(STORAGE_KEY, JSON.stringify(remote)); events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    repo.useSavedSession(); release(); await held; await pending;
    expect(repo.session.lettersByCell['3:3']).toBe('Z');
    expect(read(storage).sessions['session-a']!.lettersByCell['3:3']).toBe('Z');
    disconnect();
  });
  it('coalesces repeated restart requests while the same restart is pending', async () => {
    const { repo, storage } = setup();
    const [a, b] = await Promise.all([repo.restart(), repo.restart()]);
    expect(a.sessionId).toBe(b.sessionId);
    expect(Object.keys(read(storage).sessions)).toHaveLength(2);
  });
  it('invalidates a pending old clock snapshot after automatically adopting a remote edit', async () => {
    const { repo, storage, events, lock } = setup(); const disconnect = repo.connect();
    let release!: () => void;
    const held = lock.request(STORAGE_KEY, () => new Promise<void>(resolve => { release = resolve; }));
    await Promise.resolve();
    const pending = repo.saveSession({ ...repo.session, activeSeconds: 2, revision: 1 });
    const remote = state(); remote.sessions['session-a'] = applyLetter(session(), '3:3', 'Z', at);
    storage.setItem(STORAGE_KEY, JSON.stringify(remote)); events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(repo.session).toMatchObject({ lettersByCell: { '3:3': 'Z' }, activeSeconds: 2 });
    release(); await held; await pending;
    expect(read(storage).sessions['session-a']!.lettersByCell).toEqual({ '3:3': 'Z' });
    expect(read(storage).sessions['session-a']!.activeSeconds).toBe(2);
    await repo.saveSession({ ...repo.session, activeSeconds: 3, revision: 2 });
    expect(read(storage).sessions['session-a']).toMatchObject({ lettersByCell: { '3:3': 'Z' }, activeSeconds: 3 });
    expect(repo.notice).toBe(''); disconnect();
  });
  it('cancels a waiting restart when the user subsequently chooses the saved version', async () => {
    const { repo, storage, events, lock } = setup(); const disconnect = repo.connect();
    let release!: () => void;
    const held = lock.request(STORAGE_KEY, () => new Promise<void>(resolve => { release = resolve; }));
    await Promise.resolve();
    const pending = repo.saveSession(applyLetter(repo.session, '3:3', 'A', at));
    const restarting = repo.restart();
    const remote = state(); remote.sessions['session-a'] = applyLetter(session(), '3:3', 'Z', at);
    storage.setItem(STORAGE_KEY, JSON.stringify(remote)); events.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    repo.useSavedSession(); release(); await held; await pending; await restarting;
    expect(repo.session.sessionId).toBe('session-a');
    expect(repo.session.lettersByCell['3:3']).toBe('Z');
    expect(read(storage).activeFreeSessionId).toBe('session-a');
    expect(Object.keys(read(storage).sessions)).toHaveLength(1);
    disconnect();
  });
  it('rebases every pending clock when a remote edit is discovered inside the write lock', async () => {
    const { repo, storage, lock } = setup();
    let release!: () => void;
    const held = lock.request(STORAGE_KEY, () => new Promise<void>(resolve => { release = resolve; }));
    await Promise.resolve();
    const first = repo.saveSession({ ...repo.session, activeSeconds: 2, revision: 1 });
    const second = repo.saveSession({ ...repo.session, activeSeconds: 3, revision: 2 });
    const remote = state(); remote.sessions['session-a'] = applyLetter(session(), '3:3', 'Z', at);
    storage.setItem(STORAGE_KEY, JSON.stringify(remote));
    release(); await held; await first; await second;
    expect(read(storage).sessions['session-a']).toMatchObject({ lettersByCell: { '3:3': 'Z' }, activeSeconds: 3 });
    expect(repo.session.lettersByCell).toEqual({ '3:3': 'Z' }); expect(repo.notice).toBe('');
  });
  it('preserves remote clock time across multiple already queued local edits', async () => {
    const { repo, storage, lock } = setup();
    let release!: () => void;
    const held = lock.request(STORAGE_KEY, () => new Promise<void>(resolve => { release = resolve; })); await Promise.resolve();
    const a = applyLetter(repo.session, '3:3', 'A', at), b = applyLetter(a, '3:4', 'B', at);
    const first = repo.saveSession(a), second = repo.saveSession(b);
    const remote = state(); remote.sessions['session-a'] = { ...session(), activeSeconds: 20, revision: 1 };
    storage.setItem(STORAGE_KEY, JSON.stringify(remote)); release(); await held; await first; await second;
    expect(read(storage).sessions['session-a']).toMatchObject({ lettersByCell: { '3:3': 'A', '3:4': 'B' }, activeSeconds: 20 });
    expect(repo.session.activeSeconds).toBe(20); expect(repo.notice).toBe('');
  });
  it.each(['puzzle', 'catalog', 'blocked-letter', 'completed'])('rejects an incompatible remote session found inside the write lock (%s)', async kind => {
    const { repo, storage } = setup();
    const remote = state(), saved = remote.sessions['session-a']!;
    if (kind === 'puzzle') saved.puzzleId = 'foreign';
    if (kind === 'catalog') saved.catalogVersion = '99.0.0';
    if (kind === 'blocked-letter') saved.lettersByCell['0:0'] = 'Z';
    if (kind === 'completed') { saved.status = 'completed'; saved.completedAt = at; }
    saved.revision = 1;
    const raw = JSON.stringify(remote); storage.setItem(STORAGE_KEY, raw);
    await repo.saveSession({ ...repo.session, activeSeconds: 2, revision: 1 });
    expect(repo.session.puzzleId).toBe(puzzle.puzzleId);
    expect(repo.session.status).toBe('in_progress');
    expect(repo.session.lettersByCell['0:0']).toBeUndefined();
    expect(storage.getItem(STORAGE_KEY) === raw).toBe(true);
    expect(repo.notice).toMatch(/memória/i);
  });
  it('warns before normal close only while the current session is not committed', async () => {
    const { repo, events, lock } = setup(); const disconnect = repo.connect();
    let release!: () => void;
    const held = lock.request(STORAGE_KEY, () => new Promise<void>(resolve => { release = resolve; })); await Promise.resolve();
    const pending = repo.saveSession(applyLetter(repo.session, '3:3', 'Z', at));
    const closing = new Event('beforeunload', { cancelable: true }); events.dispatchEvent(closing);
    expect(closing.defaultPrevented).toBe(true);
    expect(repo.hasUnsavedChanges).toBe(true);
    release(); await held; await pending;
    const committed = new Event('beforeunload', { cancelable: true }); events.dispatchEvent(committed);
    expect(committed.defaultPrevented).toBe(false);
    expect(repo.hasUnsavedChanges).toBe(false);
    disconnect();
  });
});
