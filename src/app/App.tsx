import { useEffect, useState } from 'react';
import { publicDemo } from '../demo/public-demo';
import { PreviewGame } from '../features/crossword/PreviewGame';
import { Brand, BrandMark } from '../components/Brand';
import { GameRepository } from '../storage/repository';
import './official-b.css';

export function App() {
  const [repository] = useState(() => new GameRepository(publicDemo));
  const [persistence, setPersistence] = useState(() => ({ id: repository.session.sessionId, notice: repository.notice, saving: repository.hasUnsavedChanges }));
  useEffect(() => {
    const sync = () => setPersistence(previous => {
      const next = { id: repository.session.sessionId, notice: repository.notice, saving: repository.hasUnsavedChanges };
      return previous.id === next.id && previous.notice === next.notice && previous.saving === next.saving ? previous : next;
    });
    const unsubscribe = repository.subscribe(sync); sync(); return unsubscribe;
  }, [repository]);
  return <div className="official-b">
    <header className="identity-header">
      <Brand />
      <p className="edition"><span className="edition-dot" />Cruzada demonstrativa <span className="edition-number">nº 01</span></p>
      <div className="play-art" aria-hidden="true"><span>A</span><span>H</span><span><BrandMark /></span><span>Á!</span></div>
      <div className="rail-thought" aria-hidden="true"><p>Cruze ideias. Jogue bonito.</p><span>Palavras que<br />dão jogo.</span><BrandMark /></div>
    </header>
    <div className="game-container"><PreviewGame key={persistence.id} puzzle={publicDemo} audience="public-demo" repository={repository} onRestart={() => { void repository.restart(); }} introduction={<>
      <section className="identity-intro" aria-label="Boas-vindas">
        <div><p className="identity-kicker"><span />Cruze ideias. Jogue bonito.</p><h1>Uma letra. <br />Muitas<br className="mobile-break" /> possibilidades.</h1><p className="identity-subtitle">Seu próximo “achei!” começa aqui.</p></div>
        <p className="puzzle-stamp"><strong>{publicDemo.entries.length}</strong><span>pistas para<br />se encontrar</span></p>
      </section>
      <div className="alpha-notice"><p>Entrelinhas · Alpha experimental</p><p>DEMO / EXPERIMENTAL · {persistence.notice || (persistence.saving ? 'Salvando alterações neste navegador. Aguarde antes de fechar. Sem diário ou streak.' : 'Progresso salvo neste navegador. Sem diário ou streak.')}</p></div>
      {persistence.notice && repository.conflicts.length > 0 && <div className="actions"><button type="button" onClick={() => repository.useSavedSession()}>Usar partida salva</button></div>}
    </>} /></div>
    <footer className="identity-footer"><BrandMark /><span>O encontro entre uma boa ideia e uma boa jogada.</span><span>{persistence.notice ? 'Demo experimental · progresso somente nesta página.' : persistence.saving ? 'Demo experimental · salvando progresso.' : 'Demo experimental · progresso salvo neste navegador.'}</span></footer>
  </div>;
}
