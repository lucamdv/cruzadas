import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { GameRepository, STORAGE_KEY } from '../../src/storage/repository';
import { publicDemo } from '../../src/demo/public-demo';
import type { PersistedStateV1 } from '../../src/content/schemas';

afterEach(() => { localStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function enableLocks() {
  let queue = Promise.resolve();
  vi.stubGlobal('navigator', Object.create(navigator, { locks: { value: { request: <T,>(_key: string, fn: () => T | Promise<T>) => { const next = queue.then(fn); queue = next.then(() => undefined); return next; } } } }));
}
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }
const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!) as PersistedStateV1;
const savedSession = () => { const state = stored(); return state.sessions[state.activeFreeSessionId!]!; };

it('autosaves, reloads the same session and input selection with checks and assistance under StrictMode', async () => {
  enableLocks(); const view = render(<StrictMode><App /></StrictMode>); await settle();
  fireEvent.input(screen.getByRole('textbox'), { target: { value: 'SOL' }, inputType: 'insertFromPaste' });
  fireEvent.click(screen.getByRole('button', { name: 'Conferir palavra' }));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Revelar letra' }));
  fireEvent.click(screen.getByRole('button', { name: 'Alternar direção' }));
  await settle(); const before = savedSession();
  expect(before.checksUsed).toBe(1); expect(before.assistsUsed).toBe(1);
  view.unmount(); await settle(); render(<StrictMode><App /></StrictMode>); await settle();
  expect(savedSession()).toEqual(before);
  expect(screen.getByText('3 de 39 casas preenchidas')).toBeVisible();
  expect(screen.getByRole('gridcell', { selected: true })).toHaveAttribute('data-cell', before.activeCell);
  expect(screen.getByText(/Progresso salvo neste navegador/)).toBeVisible();
});

it('seeds restored active seconds and flushes pagehide without double counting hidden time', async () => {
  enableLocks(); let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const repo = new GameRepository(publicDemo); await repo.saveSession({ ...repo.session, activeSeconds: 73 });
  const view = render(<App />); await settle();
  clock = 2500; fireEvent(window, new Event('pagehide')); await settle();
  expect(savedSession().activeSeconds).toBe(75);
  clock = 100000; view.unmount(); await settle();
  expect(savedSession().activeSeconds).toBe(75);
  render(<App />); await settle();
  clock = 101000; fireEvent(window, new Event('pagehide')); await settle();
  expect(savedSession().activeSeconds).toBe(76);
});

it('restores completion, asks before restarting it, and retains its saved record', async () => {
  enableLocks(); const view = render(<App />); await settle(); const input = screen.getByRole('textbox');
  for (const entry of publicDemo.entries) {
    fireEvent.click(screen.getByRole('button', { name: `${entry.direction === 'across' ? 'Horizontal' : 'Vertical'} ${entry.number}: ${entry.clueText}` }));
    fireEvent.input(input, { target: { value: entry.displayAnswer }, inputType: 'insertFromPaste' });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Finalizar partida' })); await settle(); const done = savedSession();
  view.unmount(); await settle(); render(<App />); await settle();
  expect(screen.getByRole('heading', { name: 'Partida concluída' })).toBeVisible();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: 'Recomeçar demonstração' })); await settle();
  expect(savedSession().sessionId).toBe(done.sessionId);
  confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: 'Recomeçar demonstração' })); await settle();
  expect(screen.getByText('0 de 39 casas preenchidas')).toBeVisible();
  expect(stored().sessions[done.sessionId]).toEqual(done);
  expect(savedSession().sessionId).not.toBe(done.sessionId);
});

it('uses the chosen saved clock after resolving a conflict, without reviving discarded local time', async () => {
  enableLocks(); let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  render(<App />); await settle();
  clock = 10000; fireEvent(window, new Event('pagehide')); await settle();
  expect(savedSession().activeSeconds).toBe(10);
  const remote = stored(), id = remote.activeFreeSessionId!;
  remote.sessions[id] = { ...remote.sessions[id]!, lettersByCell: { '1:0': 'Z' }, activeSeconds: 2, revision: 100 };
  fireEvent.input(screen.getByRole('textbox'), { target: { value: 'A' }, inputType: 'insertText' });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
  fireEvent(window, new StorageEvent('storage', { key: STORAGE_KEY }));
  fireEvent.click(screen.getByRole('button', { name: 'Usar partida salva' })); await settle();
  expect(screen.getByRole('gridcell', { name: /Linha 2, coluna 1/ })).toHaveTextContent('Z');
  fireEvent(window, new Event('pageshow'));
  clock = 11000; fireEvent(window, new Event('pagehide')); await settle();
  expect(savedSession().activeSeconds).toBe(3);
});

it('shows saving until commit and lets normal close wait for the pending letters', async () => {
  enableLocks(); let release!: () => void;
  const held = navigator.locks.request(STORAGE_KEY, () => new Promise<void>(resolve => { release = resolve; })); await Promise.resolve();
  const view = render(<App />);
  fireEvent.input(screen.getByRole('textbox'), { target: { value: 'SOL' }, inputType: 'insertFromPaste' });
  expect(screen.getByText(/Salvando alterações neste navegador/)).toBeVisible();
  expect(screen.queryByText(/Progresso salvo neste navegador/)).not.toBeInTheDocument();
  const closing = new Event('beforeunload', { cancelable: true }); fireEvent(window, closing);
  expect(closing.defaultPrevented).toBe(true);
  release(); await held; await settle();
  expect(screen.getByText(/Progresso salvo neste navegador/)).toBeVisible();
  view.unmount(); await settle(); render(<App />); await settle();
  expect(screen.getByText('3 de 39 casas preenchidas')).toBeVisible();
});

it('flushes the last active second before deciding whether normal close needs a warning', async () => {
  enableLocks(); let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
  render(<App />); await settle();
  const clean = new Event('beforeunload', { cancelable: true }); fireEvent(window, clean);
  expect(clean.defaultPrevented).toBe(false);
  clock = 1200;
  const closing = new Event('beforeunload', { cancelable: true }); fireEvent(window, closing);
  expect(closing.defaultPrevented).toBe(true);
  await settle(); expect(savedSession().activeSeconds).toBe(1);
});
