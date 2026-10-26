import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App';
import { publicDemo } from '../../src/demo/public-demo';

describe('Alpha público do Entrelinhas', () => {
  it('renderiza um main nomeado com título acessível em português', () => {
    render(<App />);
    const main = screen.getByRole('main', { name: 'Entrelinhas' });
    expect(within(main).getByRole('heading', { level: 1, name: 'Uma letra. Muitas possibilidades.' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Entrelinhas' })).toBeVisible();
  });

  it('mantém o campo nativo durante composição e seleção de pistas na identidade oficial', () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: 'Digite a resposta' });
    fireEvent.compositionStart(input);
    fireEvent.input(input, { target: { value: 'SÓL' }, isComposing: true });
    expect(screen.getByText('0 de 39 casas preenchidas')).toBeVisible();
    fireEvent.compositionEnd(input, { data: 'SÓL' });
    fireEvent.input(input, { target: { value: 'SÓL' }, inputType: 'insertFromComposition' });
    expect(screen.getByText('3 de 39 casas preenchidas')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima pista →' }));
    expect(screen.getByRole('textbox', { name: 'Digite a resposta' })).toBe(input);
    expect(input).toHaveFocus();
    expect(screen.getByRole('img', { name: 'Entrelinhas' })).toBeVisible();
  });

  it('abre uma demonstração jogável sem dependência do servidor privado', () => {
    render(<App />);
    expect(screen.getByText('Entrelinhas · Alpha experimental')).toBeVisible();
    expect(screen.getAllByRole('gridcell')).toHaveLength(121);
    expect(screen.getByText(/DEMO.*EXPERIMENTAL/)).toBeVisible();
    expect(screen.getByText(/Progresso somente em memória/)).toBeVisible();
    expect(screen.queryByText(/preview privado|não publicado/i)).not.toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Digite a resposta' });
    fireEvent.input(input, { target: { value: 'SOL' }, inputType: 'insertFromPaste' });
    fireEvent.click(screen.getByRole('button', { name: 'Conferir palavra' }));
    expect(screen.getByRole('status')).toHaveTextContent('Esta palavra está correta.');
  });

  it('preserva progresso ao cancelar e reinicia a mesma demo após confirmação', async () => {
    render(<App />);
    fireEvent.input(screen.getByRole('textbox'), { target: { value: 'S' }, inputType: 'insertText' });
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar demonstração' }));
    expect(screen.getByRole('gridcell', { name: /Linha 2, coluna 1/ })).toHaveTextContent('S');
    confirmation.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar demonstração' }));
    expect(await screen.findByText(/0 de \d+ casas preenchidas/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Finalizar partida' })).toBeEnabled();
  });

  it('confirma revelações, conclui todas as palavras e permite jogar novamente', async () => {
    render(<App />);
    const input = screen.getByRole('textbox');
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Revelar letra' }));
    expect(screen.getByText('0 de 39 casas preenchidas')).toBeVisible();
    confirmation.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Revelar letra' }));
    expect(screen.getByRole('gridcell', { name: /Linha 2, coluna 1/ })).toHaveTextContent('S');
    for (const entry of publicDemo.entries) {
      fireEvent.click(screen.getByRole('button', { name: `${entry.direction === 'across' ? 'Horizontal' : 'Vertical'} ${entry.number}: ${entry.clueText}` }));
      fireEvent.input(input, { target: { value: entry.displayAnswer }, inputType: 'insertFromPaste' });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar partida' }));
    expect(screen.getByRole('heading', { name: 'Partida concluída' })).toHaveFocus();
    expect(screen.getByText(/11 respostas · 1 ajuda/)).toBeVisible();
    confirmation.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Recomeçar demonstração' }));
    expect(confirmation).toHaveBeenCalledOnce();
    expect(await screen.findByText('0 de 39 casas preenchidas')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Partida concluída' })).not.toBeInTheDocument();
  });
});
