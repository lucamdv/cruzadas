import{it,expect}from'vitest';import{GameSessionSchema}from'../../src/content/schemas';
import{createGameSession,applyLetter,checkSolved,selectCell,selectEntry,enterText,backspace,moveCell,moveClue,revealLetter,checkWord,finishSession}from'../../src/domain/session';import{previewFixture}from'../helpers/play-preview-fixture';
const at='2026-10-25T15:00:00.000Z';
it('does not mutate navigation after completion or across puzzle identities',()=>{
 const p=previewFixture(),s=createGameSession(p,'test',at),completed={...s,status:'completed' as const};
 expect(moveCell(completed,p,1,0,at)).toBe(completed);const foreign={...s,puzzleId:'foreign'};expect(moveCell(foreign,p,1,0,at)).toBe(foreign);
});
it('uses canonical GameSession with independent empty letters and shared cells',()=>{
 const p=previewFixture(),s=createGameSession(p,'test-session',at);expect(GameSessionSchema.safeParse(s).success).toBe(true);expect(s.lettersByCell).toEqual({});
 const next=applyLetter(s,'3:3','á',at);expect(next.lettersByCell['3:3']).toBe('A');expect(s.lettersByCell).toEqual({});expect(next.revision).toBe(1);
});
it('selects a crossing predictably, toggles direction and navigates clues',()=>{
 const p=previewFixture(),s=createGameSession(p,'test',at),a=selectCell(s,p,'3:3',false,at);expect(a.activeCell).toBe('3:3');expect(a.activeDirection).toBe('across');
 const b=selectCell(a,p,'3:3',true,at);expect(b.activeDirection).toBe('down');expect(selectCell(b,p,'0:0',false,at)).toEqual(b);
 expect(moveClue(a,p,1,at).activeCell).toBe('4:3');expect(selectEntry(s,p,'synthetic-down-1',at).activeDirection).toBe('down');
});
it('enters a word once, shares letters, backspaces and never changes the solution',()=>{
 const p=previewFixture(),before=JSON.stringify(p),s=selectCell(createGameSession(p,'test',at),p,'3:3',false,at),a=enterText(s,p,'éç',at);
 expect(a.lettersByCell['3:3']).toBe('E');expect(a.lettersByCell['3:4']).toBe('C');expect(a.activeCell).toBe('3:5');
 const erased=backspace(a,p,at);expect(erased.activeCell).toBe('3:4');expect(erased.lettersByCell['3:4']).toBeUndefined();expect(JSON.stringify(p)).toBe(before);
});
it('checks only on request, reveals as assistance and completes only an exact solution',()=>{
 const p=previewFixture(),s=selectCell(createGameSession(p,'test',at),p,'3:3',false,at),a=revealLetter(s,p,at);expect(a.lettersByCell['3:3']).toBe('Z');expect(a.assistsUsed).toBe(1);expect(checkWord(a,p,at).session.checksUsed).toBe(1);expect(finishSession(a,p,at).status).toBe('in_progress');
 const lettersByCell=Object.fromEntries(p.gridRows.flatMap((r,i)=>[...r].flatMap((l,j)=>l==='#'?[]:[[`${i}:${j}`,l]]))),done=finishSession({...a,lettersByCell},p,at);
 expect(done.status).toBe('completed');expect(done.completedAt).toBe(at);expect(finishSession(done,p,at)).toEqual(done);expect(applyLetter(done,'3:3','A',at)).toEqual(done);
});
it('does not mark incomplete or wrong solutions as completed',()=>{
 const p=previewFixture(),s=createGameSession(p,'test-session',at);expect(checkSolved(p,s)).toBe(false);
 const lettersByCell=Object.fromEntries(p.gridRows.flatMap((r,i)=>[...r].flatMap((l,j)=>l==='#'?[]:[[`${i}:${j}`,l]])));
 expect(checkSolved(p,{...s,lettersByCell})).toBe(true);expect(checkSolved(p,{...s,lettersByCell:{...lettersByCell,'3:3':'A'}})).toBe(false);
 expect(checkSolved(p,{...s,puzzleId:'other',lettersByCell})).toBe(false);
});
