import { z } from 'zod';
import type { AnswerReference, GeneratedLayout } from '../../../src/domain/grid-types';

const entry=z.strictObject({entryId:z.string().min(1).max(128),number:z.number().int().positive(),
 direction:z.enum(['across','down']),row:z.number().int().min(0).max(10),col:z.number().int().min(0).max(10),length:z.number().int().min(3).max(11)});
const shape=z.strictObject({gridRows:z.array(z.string().regex(/^[A-Z#]{11}$/u)).length(11),entries:z.array(entry).max(32)});
export type WordFirstVersion='v1'|'v11';
interface RunLocation{direction:'across'|'down';row:number;col:number;length:number}
export interface POCValidation{ok:boolean;errors:string[];metrics:{entries:number;across:number;down:number;crossings:number;filledCells:number;components:number;checkedCellRate:number;boundingBox:{rows:number;cols:number}};diagnostics?:{ignoredSingletons:RunLocation[];runIssues:RunLocation[]}}

/** Independent final scanner, including singleton runs; never imports the builder or production scanner. */
export function validateWordFirst(value:unknown,references:readonly AnswerReference[],version:WordFirstVersion='v1'):POCValidation{
 if(version!=='v1'&&version!=='v11')throw new Error('WordFirstContract');
 const metrics={entries:0,across:0,down:0,crossings:0,filledCells:0,components:0,checkedCellRate:0,boundingBox:{rows:0,cols:0}};
 const diagnostics:{ignoredSingletons:RunLocation[];runIssues:RunLocation[]}={ignoredSingletons:[],runIssues:[]};
 const errors=new Set<string>();const finish=():POCValidation=>({ok:errors.size===0,errors:[...errors].sort(),metrics,...(version==='v11'?{diagnostics}:{})});
 const parsed=shape.safeParse(value);if(!parsed.success){errors.add('Shape');return finish();}
 if(!Array.isArray(references)||references.length>100000){errors.add('References');return finish();}
 const refs=new Map<string,string>();
 for(const ref of references){
  if(!ref||typeof ref.entryId!=='string'||!ref.entryId.length||typeof ref.canonicalAnswer!=='string'||!(/^[A-Z]{3,11}$/u.test(ref.canonicalAnswer))){errors.add('References');continue;}
  if(refs.has(ref.entryId)&&refs.get(ref.entryId)!==ref.canonicalAnswer)errors.add('ReferenceIdentity');
  refs.set(ref.entryId,ref.canonicalAnswer);
 }
 const layout:GeneratedLayout=parsed.data;metrics.entries=layout.entries.length;
 const keys=new Set<string>(),ids=new Set<string>(),answers=new Set<string>();
 const claim:Array<{i:number;d:string}[]>=Array.from({length:121},()=>[]);
 const starts=[...new Set(layout.entries.map(e=>e.row*11+e.col))].sort((a,b)=>a-b);
 for(const [i,e]of layout.entries.entries()){
  if(ids.has(e.entryId))errors.add('DuplicateEntry');ids.add(e.entryId);
  const key=`${e.direction}:${e.row}:${e.col}:${e.length}`;
  if(keys.has(key))errors.add('DuplicateEntry');keys.add(key);
  if(e.number!==starts.indexOf(e.row*11+e.col)+1)errors.add('Numbering');
  if(e.direction==='across')metrics.across++;else metrics.down++;
  let physical='';
  for(let j=0;j<e.length;j++){
   const row=e.row+(e.direction==='down'?j:0),col=e.col+(e.direction==='across'?j:0);
   if(row>=11||col>=11){errors.add('Bounds');continue;}
   const cell=row*11+col,letter=layout.gridRows[row]![col]!;physical+=letter;
   if(letter==='#')errors.add('BlockedCell');
   if(claim[cell]!.some(c=>c.d===e.direction))errors.add('Overlap');
   claim[cell]!.push({i,d:e.direction});
  }
  if(!refs.has(e.entryId))errors.add('UnknownEntry');else if(refs.get(e.entryId)!==physical)errors.add('LetterMismatch');
  if(answers.has(physical))errors.add('DuplicateAnswer');answers.add(physical);
 }
 const runs=new Set<string>();const open:number[]=[];
 for(let r=0;r<11;r++)for(let c=0;c<11;c++){
  if(layout.gridRows[r]![c]==='#')continue;open.push(r*11+c);
  if(!claim[r*11+c]!.length)errors.add('OrphanCell');
  for(const direction of ['across','down']as const){
   const dr=Number(direction==='down'),dc=1-dr;
   if(r-dr>=0&&c-dc>=0&&layout.gridRows[r-dr]![c-dc]!=='#')continue;
   let length=0;
   while(r+dr*length<11&&c+dc*length<11&&layout.gridRows[r+dr*length]![c+dc*length]!=='#')length++;
   const location={direction,row:r,col:c,length};
   if(version==='v11'&&length===1){diagnostics.ignoredSingletons.push(location);continue;}
   if(length<3)errors.add('ShortRun');
   const key=`${direction}:${r}:${c}:${length}`;runs.add(key);
   if(!keys.has(key)){errors.add('GhostRun');diagnostics.runIssues.push(location);}
  }
 }
 for(const key of keys)if(!runs.has(key))errors.add('NonMaximalEntry');
 metrics.filledCells=open.length;
 if(open.length)metrics.boundingBox={rows:Math.max(...open.map(c=>Math.floor(c/11)))-Math.min(...open.map(c=>Math.floor(c/11)))+1,cols:Math.max(...open.map(c=>c%11))-Math.min(...open.map(c=>c%11))+1};
 const graph=layout.entries.map(()=>new Set<number>());
 for(const claims of claim){
  if(claims.some(c=>c.d==='across')&&claims.some(c=>c.d==='down'))metrics.crossings++;
  for(const a of claims)for(const b of claims)if(a.i!==b.i)graph[a.i]!.add(b.i);
 }
 const seen=new Set<number>();
 for(let i=0;i<graph.length;i++){
  if(seen.has(i))continue;metrics.components++;const queue=[i];
  for(let j=0;j<queue.length;j++){const n=queue[j]!;if(seen.has(n))continue;seen.add(n);for(const next of graph[n]!)if(!seen.has(next))queue.push(next);}
 }
 metrics.checkedCellRate=open.length?metrics.crossings/open.length:0;
 if(metrics.entries<10)errors.add('MinEntries');
 if(metrics.across<4||metrics.down<4)errors.add('Directions');
 if(metrics.crossings<8)errors.add('MinCrossings');
 if(metrics.components!==1)errors.add('Disconnected');
 return finish();
}
