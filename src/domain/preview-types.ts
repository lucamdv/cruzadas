import type { GeneratedLayout, GeneratedLayoutEntry } from './grid-types';
export interface PreviewEntry extends GeneratedLayoutEntry { clueText:string; displayAnswer:string; enumeration:number[] }
/** Experimental draft contract, deliberately NOT an approved catalog CrosswordPuzzle.
 * Public display requires separate explicit authorization (as for the Alpha demo).
 */
export interface PreviewPuzzle extends GeneratedLayout { puzzleId:string;catalogVersion:string;kind:'experimental';editorialStatus:'draft';publicationEligible:false;entries:PreviewEntry[] }
