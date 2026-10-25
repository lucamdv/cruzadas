import type{PreviewPuzzle}from'../../src/domain/preview-types';
/** Independent artificial words; never the real POC041 seed or a public catalog. */
export function previewFixture():PreviewPuzzle{
 const rows=['ZYXWV','UTSRQ','PONML','KJIHG','FEDCB'],entries:PreviewPuzzle['entries']=[];
 for(let i=0;i<5;i++)for(const direction of['across','down']as const){const answer=direction==='across'?rows[i]!:rows.map(r=>r[i]).join('');entries.push({entryId:`synthetic-${direction}-${i}`,row:direction==='across'?i+3:3,col:direction==='down'?i+3:3,direction,length:5,number:direction==='down'?i+1:i===0?1:i+5,displayAnswer:answer,clueText:`Pista artificial ${direction} ${i+1}`,enumeration:[5]});}
 return{kind:'experimental',editorialStatus:'draft',publicationEligible:false,puzzleId:'synthetic-preview',catalogVersion:'0.0.0-experimental.preview',gridRows:['###########','###########','###########',...rows.map(r=>'###'+r+'###'),'###########','###########','###########'],entries};
}
