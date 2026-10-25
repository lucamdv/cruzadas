import{act,fireEvent,render,screen,within}from'@testing-library/react';import{it,expect,vi}from'vitest';
import{PreviewGame}from'../../src/features/crossword/PreviewGame';import{previewFixture}from'../helpers/play-preview-fixture';
it('renders physical cells and handles input once with a persistent keyboard field',()=>{
 render(<PreviewGame puzzle={previewFixture()}/>);const input=screen.getByRole('textbox',{name:'Digite a resposta'});
 expect(screen.getAllByRole('row')).toHaveLength(11);expect(screen.getAllByRole('gridcell')).toHaveLength(121);fireEvent.click(screen.getByRole('gridcell',{name:/Linha 4, coluna 4/}));expect(input).toHaveFocus();
 fireEvent.keyDown(input,{key:'Z'});fireEvent.input(input,{target:{value:'Z'},inputType:'insertText'});expect(screen.getByRole('gridcell',{name:/Linha 4, coluna 4/})).toHaveTextContent('Z');
 expect(screen.getByRole('gridcell',{name:/Linha 4, coluna 5/})).not.toHaveTextContent('Z');expect(screen.queryByText(/correta|incorreta/)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Vertical 1:/}));expect(screen.getByRole('textbox',{name:'Digite a resposta'})).toBe(input);expect(input).toHaveFocus();
 expect(within(screen.getByRole('region',{name:'Pista ativa'})).getByText(/Vertical 1/)).toBeInTheDocument();
});
it('excludes native confirmation time from the active clock',()=>{
 vi.useFakeTimers();let clock=0;vi.spyOn(performance,'now').mockImplementation(()=>clock);
 try{
  render(<PreviewGame puzzle={previewFixture()}/>);
  act(()=>{clock=2000;vi.advanceTimersByTime(2000);});
  vi.spyOn(window,'confirm').mockImplementation(()=>{clock+=15000;return true;});
  fireEvent.click(screen.getByRole('button',{name:'Revelar letra'}));
  act(()=>{clock+=1000;vi.advanceTimersByTime(1000);});
  const puzzle=previewFixture(),input=screen.getByRole('textbox',{name:'Digite a resposta'});
  for(const e of puzzle.entries){fireEvent.click(screen.getByRole('button',{name:`${e.direction==='across'?'Horizontal':'Vertical'} ${e.number}: ${e.clueText}`}));fireEvent.input(input,{target:{value:e.displayAnswer},inputType:'insertFromPaste'});}
  fireEvent.click(screen.getByRole('button',{name:'Finalizar partida'}));expect(screen.getByText(/Tempo ativo 0:03/)).toBeVisible();
 }finally{vi.useRealTimers();}
});
it('does not duplicate composition-final input and handles virtual deletion once',()=>{
 render(<PreviewGame puzzle={previewFixture()}/>);const input=screen.getByRole('textbox',{name:'Digite a resposta'});
 fireEvent.compositionStart(input);fireEvent.input(input,{target:{value:'é'},inputType:'insertCompositionText',isComposing:true});
 expect(screen.getByRole('gridcell',{name:/Linha 4, coluna 4/})).not.toHaveTextContent('E');
 fireEvent.compositionEnd(input,{data:'é',target:{value:'é'}});fireEvent.input(input,{target:{value:'é'},inputType:'insertText'});
 expect(screen.getByRole('gridcell',{name:/Linha 4, coluna 4/})).toHaveTextContent('E');expect(screen.getByRole('gridcell',{name:/Linha 4, coluna 5/})).not.toHaveTextContent('E');
 fireEvent(input,new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true}));fireEvent.input(input,{target:{value:''},inputType:'deleteContentBackward'});
 expect(screen.getByRole('gridcell',{name:/Linha 4, coluna 4/})).not.toHaveTextContent('E');
});
it('checks on request, confirms assistance and recognizes an actually solved game',()=>{
 const puzzle=previewFixture();render(<PreviewGame puzzle={puzzle}/>);const input=screen.getByRole('textbox',{name:'Digite a resposta'});
 fireEvent.click(screen.getByRole('button',{name:'Finalizar partida'}));expect(screen.queryByRole('heading',{name:'Partida concluída'})).not.toBeInTheDocument();
 vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'Revelar letra'}));expect(screen.getByRole('gridcell',{name:/Linha 4, coluna 4/})).toHaveTextContent('Z');
 fireEvent.click(screen.getByRole('button',{name:'Conferir palavra'}));expect(screen.getByRole('status')).toHaveTextContent(/faltam letras/);
 for(const e of puzzle.entries){fireEvent.click(screen.getByRole('button',{name:`${e.direction==='across'?'Horizontal':'Vertical'} ${e.number}: ${e.clueText}`}));fireEvent.input(input,{target:{value:e.displayAnswer},inputType:'insertFromPaste'});}
 fireEvent.click(screen.getByRole('button',{name:'Finalizar partida'}));expect(screen.getByRole('heading',{name:'Partida concluída'})).toBeVisible();expect(screen.getByText(/1 ajuda/)).toBeVisible();expect(screen.getByText(/experimental.*não publicado/i)).toBeVisible();
});
