import{useEffect,useRef,useState}from'react';import type{KeyboardEvent,ReactNode}from'react';
import type{PreviewPuzzle}from'../../domain/preview-types';import type{CellKey,GameSession}from'../../content/schemas';
import type { GameRepository } from '../../storage/repository';
import{activeEntry,applyLetter,backspace,checkWord,createGameSession,enterText,entryCells,finishSession,moveCell,moveClue,orderedEntries,revealLetter,selectCell,selectEntry}from'../../domain/session';
import'./preview-game.css';
const now=()=>new Date().toISOString();
export function PreviewGame({puzzle,audience='private-preview',onRestart,introduction,repository}:{puzzle:PreviewPuzzle;audience?:'private-preview'|'public-demo';onRestart?:()=>void;introduction?:ReactNode;repository?:GameRepository}){
 const publicDemo=audience==='public-demo';
 const[session,setSession]=useState(()=>repository?.session??createGameSession(puzzle,crypto.randomUUID(),now())),current=useRef(session),input=useRef<HTMLInputElement>(null),result=useRef<HTMLHeadingElement>(null),checkButton=useRef<HTMLButtonElement>(null),board=useRef<HTMLElement>(null);
 const[message,setMessage]=useState(''),[zoom,setZoom]=useState(false),clockPaused=useRef(false),syncClock=useRef<()=>void>(()=>{}),resetClock=useRef<(seconds:number,exact?:boolean)=>void>(()=>{}),composing=useRef(false),ignoreFinal=useRef<string|null>(null),deleted=useRef(false),timers=useRef<number[]>([]),activeMs=useRef(session.activeSeconds*1000);
 const update=(fn:(s:GameSession)=>GameSession)=>{const next=fn(current.current);if(next===current.current)return;current.current=next;setSession(next);void repository?.saveSession(next);};
 const focus=()=>input.current?.focus({preventScroll:true});
 const later=(fn:()=>void)=>{const id=window.setTimeout(()=>{timers.current=timers.current.filter(t=>t!==id);fn();},0);timers.current.push(id);};
 const commit=(text:string)=>{try{update(s=>enterText(s,puzzle,text,now()));setMessage('');}catch{setMessage('Use letras; o texto precisa caber na resposta selecionada.');}if(input.current)input.current.value='';};
 useEffect(()=>()=>timers.current.forEach(t=>clearTimeout(t)),[]);
 useEffect(()=>{
  if(!repository)return;
  const disconnect=repository.connect(()=>syncClock.current());
  const unsubscribe=repository.subscribe(()=>{const next=repository.session;if(next.sessionId!==current.current.sessionId||next===current.current)return;resetClock.current(next.activeSeconds,next.activeSeconds<current.current.activeSeconds);current.current=next;setSession(next);});
  void repository.saveSession(current.current);
  return()=>{unsubscribe();disconnect();};
 },[repository]);
 useEffect(()=>{
  const el=input.current;if(!el)return;
  const before=(event:InputEvent)=>{if(composing.current||!['deleteContentBackward','deleteContentForward'].includes(event.inputType))return;event.preventDefault();if(!deleted.current)update(s=>event.inputType==='deleteContentBackward'?backspace(s,puzzle,now()):s.activeCell?applyLetter(s,s.activeCell,'',now()):s);deleted.current=true;el.value='';later(()=>{deleted.current=false;});};
  el.addEventListener('beforeinput',before);return()=>el.removeEventListener('beforeinput',before);
 },[puzzle]);
 useEffect(()=>{
  let interval:number|undefined,last=performance.now();
  const flush=()=>{const t=performance.now();if(current.current.status!=='in_progress'){last=t;return;}activeMs.current+=Math.max(0,t-last);last=t;const seconds=Math.floor(activeMs.current/1000);if(current.current.activeSeconds!==seconds)update(s=>({...s,activeSeconds:seconds,updatedAt:now(),revision:s.revision+1}));};
  const sync=()=>{if(interval!==undefined){flush();clearInterval(interval);interval=undefined;}if(!document.hidden&&current.current.status==='in_progress'&&!clockPaused.current){last=performance.now();interval=window.setInterval(flush,500);}};
  const hide=()=>{if(interval!==undefined){flush();clearInterval(interval);interval=undefined;}};
  resetClock.current=(seconds,exact=false)=>{const t=performance.now();activeMs.current=exact?seconds*1000:Math.max(seconds*1000,activeMs.current+(interval!==undefined?Math.max(0,t-last):0));last=t;};
  syncClock.current=sync;sync();document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',sync);return()=>{hide();document.removeEventListener('visibilitychange',sync);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',sync);syncClock.current=()=>{};resetClock.current=()=>{};};
 },[session.status]);
 useEffect(()=>{if(session.status==='completed')result.current?.focus();},[session.status]);
 const e=activeEntry(puzzle,session),selected=new Set(e?entryCells(e):[]),entries=orderedEntries(puzzle),filled=Object.keys(session.lettersByCell).length,total=puzzle.gridRows.join('').replaceAll('#','').length,completed=session.status==='completed';
 const choose=(id:string)=>{update(s=>selectEntry(s,puzzle,id,now()));setMessage('');focus();board.current?.scrollIntoView?.({block:'nearest'});};
 const onKey=(event:KeyboardEvent<HTMLElement>)=>{
  if(event.nativeEvent.isComposing||composing.current||event.keyCode===229||event.ctrlKey||event.metaKey||event.altKey)return;
  const moves:Record<string,[number,number]>={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  if(event.key==='Escape'){event.preventDefault();checkButton.current?.focus();return;}
  if(moves[event.key]){event.preventDefault();const[dr,dc]=moves[event.key]!;update(s=>moveCell(s,puzzle,dr,dc,now()));focus();}
  else if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();update(s=>event.key==='Backspace'?backspace(s,puzzle,now()):s.activeCell?applyLetter(s,s.activeCell,'',now()):s);deleted.current=true;later(()=>{deleted.current=false;});}
  else if(event.key==='Tab'||event.key==='Enter'){event.preventDefault();update(s=>moveClue(s,puzzle,event.shiftKey?-1:1,now()));focus();}
  else if(event.key===' '){event.preventDefault();update(s=>s.activeCell?selectCell(s,puzzle,s.activeCell,true,now()):s);focus();}
  else if(event.currentTarget!==input.current&&event.key.length===1){event.preventDefault();commit(event.key);focus();}
 };
 const onCheck=()=>{const r=checkWord(current.current,puzzle,now());update(()=>r.session);setMessage(r.verdict==='correct'?'Esta palavra está correta.':r.verdict==='incomplete'?'Ainda faltam letras nesta palavra.':'Há letras incorretas nesta palavra. Revise os cruzamentos.');focus();};
 const onReveal=()=>{clockPaused.current=true;syncClock.current();let yes:boolean;try{yes=window.confirm('Revelar esta letra? A partida será marcada como assistida.');}finally{clockPaused.current=false;syncClock.current();}if(yes){update(s=>revealLetter(s,puzzle,now()));setMessage('Letra revelada. Partida assistida.');}focus();};
 const onFinish=()=>{syncClock.current();const next=finishSession(current.current,puzzle,now());if(next.status!=='completed'){setMessage('Ainda faltam letras ou há algo a revisar.');focus();}else{update(()=>next);setMessage('');}};
 const restart=()=>{if(!onRestart)return;let yes=true;if(current.current.status==='completed'||Object.keys(current.current.lettersByCell).length||current.current.checksUsed||current.current.assistsUsed||current.current.activeSeconds){clockPaused.current=true;syncClock.current();try{yes=window.confirm(repository?.persistent?'Recomeçar esta demonstração? Uma nova partida será criada; a anterior continuará salva.':'Recomeçar esta demonstração? O progresso atual será apagado.');}finally{clockPaused.current=false;syncClock.current();}}if(yes)onRestart();else focus();};
 return <main className="preview-shell" aria-label={publicDemo?'Entrelinhas':'Entrelinhas — preview privado'}>
  {introduction??<><header className="masthead"><div><p className="eyebrow">UM TEMPO ENTRE PALAVRAS</p><h1>Entrelinhas<span aria-hidden="true">.</span></h1></div><p className="preview-badge">{publicDemo?'Entrelinhas · Alpha experimental':'Experimental · draft · não publicado'}</p></header>
  <div className="intro"><h2>Só mais um cruzamento.</h2><p>{puzzle.entries.length} pistas, uma letra por encontro.</p></div>
  <p className="ephemeral">{publicDemo?'DEMO / EXPERIMENTAL · somente em memória. Recarregar apaga o progresso. Sem diário ou streak.':'Preview privado, somente em memória. Recarregar apaga o progresso. Sem diário ou streak.'}</p></>}
  {completed&&<section className="result-card" aria-labelledby="result-title"><p className="eyebrow">BEM ENCONTRADAS</p><h2 id="result-title" ref={result} tabIndex={-1}>Partida concluída</h2><p>{puzzle.entries.length} respostas · {session.assistsUsed} ajuda(s) · {session.checksUsed} conferência(s)</p><p>Tempo ativo {Math.floor(session.activeSeconds/60)}:{String(session.activeSeconds%60).padStart(2,'0')} · {session.assistsUsed?'Assistida':'Sem revelações'}</p><p>Conclusão deste experimento; revisão editorial e publicação continuam pendentes.</p></section>}
  <div className="play-layout"><section className="board-section" ref={board} aria-label="Tabuleiro">
   <section className="current-clue" aria-label="Pista ativa" id="active-clue"><div className="clue-meta"><span>{e?`${e.direction==='across'?'Horizontal':'Vertical'} ${e.number} · ${e.enumeration.join(', ')} letras`:'Escolha uma pista'}</span><button type="button" disabled={completed} aria-label="Alternar direção" onClick={()=>{update(s=>s.activeCell?selectCell(s,puzzle,s.activeCell,true,now()):s);focus();}}>↔</button></div><p>{e?.clueText}</p></section>
   <div className="board-meta"><span>{filled} de {total} casas preenchidas</span><button type="button" aria-pressed={zoom} onClick={()=>setZoom(z=>!z)}>{zoom?'Reduzir grade':'Ampliar grade'}</button></div>
   <div className="board-entry"><div className="board-scroll"><div className={`crossword-grid${zoom?' zoomed':''}`} role="grid" aria-label="Grade 11 por 11" aria-rowcount={11} aria-colcount={11}>
    {puzzle.gridRows.map((row,r)=><div className="grid-row" role="row" key={r}>{[...row].map((letter,c)=>{const k=`${r}:${c}`as CellKey;if(letter==='#')return <span key={k} className="block" role="gridcell" aria-disabled="true" aria-label={`Casa preta, linha ${r+1}, coluna ${c+1}`} aria-rowindex={r+1} aria-colindex={c+1}/>;const starts=puzzle.entries.filter(e=>e.row===r&&e.col===c),number=starts[0]?.number,claimed=puzzle.entries.filter(e=>entryCells(e).includes(k));return <button key={k} type="button" role="gridcell" data-cell={k} aria-rowindex={r+1} aria-colindex={c+1} aria-selected={session.activeCell===k} aria-label={`Linha ${r+1}, coluna ${c+1}, ${claimed.map(e=>`${e.direction==='across'?'Horizontal':'Vertical'} ${e.number}`).join(', ')}, ${session.lettersByCell[k]??'vazia'}`} tabIndex={session.activeCell===k?0:-1} disabled={completed} className={`cell${selected.has(k)?' in-word':''}${session.activeCell===k?' current':''}`} onKeyDown={onKey} onMouseDown={event=>event.preventDefault()} onClick={()=>{update(s=>selectCell(s,puzzle,k,true,now()));setMessage('');focus();}}>{number&&<small aria-hidden="true">{number}</small>}<span aria-hidden="true">{session.lettersByCell[k]??''}</span></button>;})}</div>)}
   </div></div>
   <div className="keyboard-entry"><label className="input-label" htmlFor="letter-input">Escreva na pista selecionada</label><input id="letter-input" ref={input} className="letter-input" aria-label="Digite a resposta" aria-describedby="active-clue input-help" autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false} inputMode="text" enterKeyHint="next" readOnly={completed} onKeyDown={onKey} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={event=>{composing.current=false;const text=event.currentTarget.value||event.data;ignoreFinal.current=text;commit(text);later(()=>{ignoreFinal.current=null;});}} onInput={event=>{const native=event.nativeEvent as InputEvent;if(composing.current||native.isComposing)return;const value=event.currentTarget.value;if(native.inputType?.startsWith('delete')){if(!deleted.current)update(s=>backspace(s,puzzle,now()));deleted.current=false;event.currentTarget.value='';return;}if(ignoreFinal.current!==null&&ignoreFinal.current===value){ignoreFinal.current=null;event.currentTarget.value='';return;}commit(value);}} placeholder={completed?'Partida concluída':'Toque aqui e digite na grade'}/>
   <p id="input-help" className="keyboard-help">Setas movem · Tab muda de pista · Espaço alterna · Esc sai do campo</p></div></div>
   <div className="actions"><button ref={checkButton} type="button" disabled={completed} onClick={onCheck}>Conferir palavra</button><button type="button" disabled={completed} onClick={onReveal}>Revelar letra</button><button type="button" disabled={completed} className="primary" aria-label="Finalizar partida" onClick={onFinish}>Finalizar</button></div>
   <p role="status" className="feedback">{message}</p>
   <nav className="clue-navigation" aria-label="Navegar pelas pistas"><button type="button" disabled={completed} onClick={()=>{update(s=>moveClue(s,puzzle,-1,now()));focus();}}>← Pista anterior</button><button type="button" disabled={completed} onClick={()=>{update(s=>moveClue(s,puzzle,1,now()));focus();}}>Próxima pista →</button></nav>
  </section><aside className="clues" aria-label="Lista de pistas">{(['across','down']as const).map(direction=><section key={direction}><h2>{direction==='across'?'Horizontais':'Verticais'}</h2><ol>{entries.filter(x=>x.direction===direction).map(clue=><li key={clue.entryId}><button type="button" disabled={completed} aria-current={e?.entryId===clue.entryId?'true':undefined} aria-label={`${direction==='across'?'Horizontal':'Vertical'} ${clue.number}: ${clue.clueText}`} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(clue.entryId)}><span className="clue-number">{clue.number}</span><span>{clue.clueText} <em>({clue.enumeration.join(', ')})</em></span></button></li>)}</ol></section>)}</aside></div>
  {onRestart&&<div className="actions restart"><button type="button" onClick={restart}>Recomeçar demonstração</button></div>}
  <footer className="preview-footer">{publicDemo?'Demonstração pública original, em rascunho. Sem aprovação editorial ou equivalência à rubrica de produção.':'Uma partida para experimentar a interação. Não é um lançamento ou catálogo aprovado.'}</footer>
 </main>;
}
