import{CellKeySchema}from'../content/schemas';import type{GameSession,CellKey}from'../content/schemas';import type{PreviewPuzzle,PreviewEntry}from'./preview-types';import{normalizeAnswer}from'./normalization';
export function entryCells(e:PreviewEntry):CellKey[]{return Array.from({length:e.length},(_,i)=>`${e.row+(e.direction==='down'?i:0)}:${e.col+(e.direction==='across'?i:0)}`as CellKey);}
export function orderedEntries(p:PreviewPuzzle){return [...p.entries].sort((a,b)=>Number(a.direction==='down')-Number(b.direction==='down')||a.number-b.number);}
const touch=(s:GameSession,patch:Partial<GameSession>,at:string):GameSession=>({...s,...patch,updatedAt:at,revision:s.revision+1});
export function createGameSession(p:PreviewPuzzle,id:string,at:string):GameSession{const first=orderedEntries(p)[0];return{sessionId:id,puzzleId:p.puzzleId,catalogVersion:p.catalogVersion,mode:'free',status:'in_progress',lettersByCell:{},activeCell:first?entryCells(first)[0]!:null,activeDirection:first?.direction??'across',activeSeconds:0,assistsUsed:0,checksUsed:0,createdAt:at,updatedAt:at,revision:0};}
export function applyLetter(s:GameSession,cell:CellKey,input:string,at=s.updatedAt):GameSession{
 if(s.status!=='in_progress')return s;CellKeySchema.parse(cell);const value=input===''?'':normalizeAnswer(input);if(value.length>1)throw new RangeError('Uma letra por célula.');
 const lettersByCell={...s.lettersByCell};if(value)lettersByCell[cell]=value;else delete lettersByCell[cell];return{...s,lettersByCell,updatedAt:at,revision:s.revision+1};
}
export function checkSolved(p:Pick<PreviewPuzzle,'puzzleId'|'gridRows'>,s:GameSession){
 if(s.puzzleId!==p.puzzleId)return false;const cells=p.gridRows.flatMap((r,i)=>[...r].flatMap((l,j)=>l==='#'?[]:[{key:`${i}:${j}`as CellKey,letter:l}]));
 return cells.length>0&&cells.every(c=>s.lettersByCell[c.key]===c.letter)&&Object.keys(s.lettersByCell).every(k=>cells.some(c=>c.key===k));
}
export function activeEntry(p:PreviewPuzzle,s:GameSession){if(p.puzzleId!==s.puzzleId)return undefined;return p.entries.find(e=>e.direction===s.activeDirection&&s.activeCell!==null&&entryCells(e).includes(s.activeCell));}
export function selectCell(s:GameSession,p:PreviewPuzzle,cell:CellKey,toggle=false,at=s.updatedAt){
 if(s.status!=='in_progress'||s.puzzleId!==p.puzzleId)return s;const available=orderedEntries(p).filter(e=>entryCells(e).includes(cell));if(!available.length)return s;
 const preferred=toggle&&s.activeCell===cell&&available.length===2?s.activeDirection==='across'?'down':'across':s.activeDirection;
 return touch(s,{activeCell:cell,activeDirection:available.find(e=>e.direction===preferred)?.direction??available[0]!.direction},at);
}
export function selectEntry(s:GameSession,p:PreviewPuzzle,id:string,at=s.updatedAt){const e=p.entries.find(e=>e.entryId===id);if(!e||s.status!=='in_progress'||s.puzzleId!==p.puzzleId)return s;return touch(s,{activeCell:entryCells(e)[0]!,activeDirection:e.direction},at);}
export function enterText(s:GameSession,p:PreviewPuzzle,text:string,at=s.updatedAt){
 const e=activeEntry(p,s);if(!e||s.status!=='in_progress'||!text)return s;const letters=normalizeAnswer(text),cells=entryCells(e),start=cells.indexOf(s.activeCell!);if(letters.length>cells.length-start)throw new RangeError('Texto excede a resposta ativa.');
 let next=s;for(let i=0;i<letters.length;i++)next=applyLetter(next,cells[start+i]!,letters[i]!,at);return{...next,activeCell:cells[Math.min(start+letters.length,cells.length-1)]!};
}
export function backspace(s:GameSession,p:PreviewPuzzle,at=s.updatedAt){const e=activeEntry(p,s);if(!e||s.status!=='in_progress')return s;const cells=entryCells(e),i=cells.indexOf(s.activeCell!),cell=s.lettersByCell[s.activeCell!]?s.activeCell!:cells[Math.max(0,i-1)]!;return{...applyLetter(s,cell,'',at),activeCell:cell};}
export function moveClue(s:GameSession,p:PreviewPuzzle,delta:number,at=s.updatedAt){const entries=orderedEntries(p),active=activeEntry(p,s);if(!entries.length)return s;const i=entries.findIndex(e=>e.entryId===active?.entryId),next=entries[((i+delta)%entries.length+entries.length)%entries.length]!;return selectEntry(s,p,next.entryId,at);}
export function moveCell(s:GameSession,p:PreviewPuzzle,dr:number,dc:number,at=s.updatedAt){if(s.status!=='in_progress'||s.puzzleId!==p.puzzleId||!s.activeCell||Math.abs(dr)+Math.abs(dc)!==1)return s;const [r,c]=s.activeCell.split(':').map(Number);for(let i=1;i<12;i++){const row=r!+dr*i,col=c!+dc*i;if(row<0||row>=p.gridRows.length||col<0||col>=p.gridRows[row]!.length)break;if(p.gridRows[row]![col]!=='#')return selectCell({...s,activeDirection:dr?'down':'across'},p,`${row}:${col}`,false,at);}return s;}
export function revealLetter(s:GameSession,p:PreviewPuzzle,at=s.updatedAt){if(!activeEntry(p,s)||!s.activeCell||s.status!=='in_progress')return s;const [r,c]=s.activeCell.split(':').map(Number),letter=p.gridRows[r!]![c!]!;return{...applyLetter(s,s.activeCell,letter,at),assistsUsed:s.assistsUsed+1};}
export function checkWord(s:GameSession,p:PreviewPuzzle,at=s.updatedAt):{session:GameSession;verdict:'correct'|'incomplete'|'incorrect'}{const e=activeEntry(p,s);if(!e||s.status!=='in_progress')return{session:s,verdict:'incomplete'};const cells=entryCells(e),incomplete=cells.some(k=>!s.lettersByCell[k]),correct=cells.every(k=>{const[r,c]=k.split(':').map(Number);return s.lettersByCell[k]===p.gridRows[r!]![c!];});return{session:touch(s,{checksUsed:s.checksUsed+1},at),verdict:incomplete?'incomplete':correct?'correct':'incorrect'};}
export function finishSession(s:GameSession,p:PreviewPuzzle,at=s.updatedAt){return s.status==='in_progress'&&checkSolved(p,s)?touch(s,{status:'completed',completedAt:at},at):s;}
