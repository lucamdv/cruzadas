import { useState } from 'react';
import { publicDemo } from '../demo/public-demo';
import { PreviewGame } from '../features/crossword/PreviewGame';
import { Brand, BrandMark } from '../components/Brand';
import './official-b.css';

export function App() {
  const [attempt, setAttempt] = useState(0);
  return <div className="official-b">
    <header className="identity-header">
      <Brand />
      <p className="edition"><span className="edition-dot" />Cruzada demonstrativa <span className="edition-number">nº 01</span></p>
      <div className="play-art" aria-hidden="true"><span>A</span><span>H</span><span><BrandMark /></span><span>Á!</span></div>
      <div className="rail-thought" aria-hidden="true"><p>Cruze ideias. Jogue bonito.</p><span>Palavras que<br />dão jogo.</span><BrandMark /></div>
    </header>
    <div className="game-container"><PreviewGame key={attempt} puzzle={publicDemo} audience="public-demo" onRestart={() => setAttempt(value => value + 1)} introduction={<>
      <section className="identity-intro" aria-label="Boas-vindas">
        <div><p className="identity-kicker"><span />Cruze ideias. Jogue bonito.</p><h1>Uma letra. <br />Muitas<br className="mobile-break" /> possibilidades.</h1><p className="identity-subtitle">Seu próximo “achei!” começa aqui.</p></div>
        <p className="puzzle-stamp"><strong>{publicDemo.entries.length}</strong><span>pistas para<br />se encontrar</span></p>
      </section>
      <div className="alpha-notice"><p>Entrelinhas · Alpha experimental</p><p>DEMO / EXPERIMENTAL · somente em memória. Recarregar apaga o progresso. Sem diário ou streak.</p></div>
    </>} /></div>
    <footer className="identity-footer"><BrandMark /><span>O encontro entre uma boa ideia e uma boa jogada.</span><span>Demo experimental · progresso somente nesta página.</span></footer>
  </div>;
}
