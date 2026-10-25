import type { PreviewPuzzle } from '../domain/preview-types';

/**
 * Public demonstration authored independently for the authorized Alpha.
 * Original clues and a hand-built layout; no corpus, private puzzle or generator input.
 * Draft only: this sparse POC does not meet the production crossing rubric.
 */
export const publicDemo: PreviewPuzzle = {
  puzzleId: 'entrelinhas-public-demo-01',
  catalogVersion: '0.0.0-alpha.demo.1',
  kind: 'experimental',
  editorialStatus: 'draft',
  publicationEligible: false,
  gridRows: [
    '###########',
    'SOL###VOZ##',
    '##A###E####',
    '##P###R###M',
    '##I###D###E',
    'PASSATEMPOS',
    'A###M###E##',
    'Z###O###D##',
    '####R###R##',
    '##LUA###ASA',
    '###########',
  ],
  entries: [
    { entryId: 'demo-sol', number: 1, direction: 'across', row: 1, col: 0, length: 3, displayAnswer: 'Sol', enumeration: [3], clueText: 'Estrela que ilumina nossos dias.' },
    { entryId: 'demo-lapis', number: 2, direction: 'down', row: 1, col: 2, length: 5, displayAnswer: 'Lápis', enumeration: [5], clueText: 'Companheiro da borracha no estojo.' },
    { entryId: 'demo-voz', number: 3, direction: 'across', row: 1, col: 6, length: 3, displayAnswer: 'Voz', enumeration: [3], clueText: 'Instrumento de quem canta sem levar nada nas mãos.' },
    { entryId: 'demo-verde', number: 3, direction: 'down', row: 1, col: 6, length: 5, displayAnswer: 'Verde', enumeration: [5], clueText: 'Cor que autoriza seguir no semáforo.' },
    { entryId: 'demo-mes', number: 4, direction: 'down', row: 3, col: 10, length: 3, displayAnswer: 'Mês', enumeration: [3], clueText: 'Cada uma das doze divisões do ano.' },
    { entryId: 'demo-passatempos', number: 5, direction: 'across', row: 5, col: 0, length: 11, displayAnswer: 'Passatempos', enumeration: [11], clueText: 'Atividades que tornam as horas livres mais agradáveis.' },
    { entryId: 'demo-paz', number: 5, direction: 'down', row: 5, col: 0, length: 3, displayAnswer: 'Paz', enumeration: [3], clueText: 'Tranquilidade de uma convivência sem conflitos.' },
    { entryId: 'demo-amora', number: 6, direction: 'down', row: 5, col: 4, length: 5, displayAnswer: 'Amora', enumeration: [5], clueText: 'Frutinha escura que costuma tingir os dedos ao ser colhida.' },
    { entryId: 'demo-pedra', number: 7, direction: 'down', row: 5, col: 8, length: 5, displayAnswer: 'Pedra', enumeration: [5], clueText: 'Fragmento de rocha encontrado pelo caminho.' },
    { entryId: 'demo-lua', number: 8, direction: 'across', row: 9, col: 2, length: 3, displayAnswer: 'Lua', enumeration: [3], clueText: 'Astro que vemos mudar de fase ao longo das noites.' },
    { entryId: 'demo-asa', number: 9, direction: 'across', row: 9, col: 8, length: 3, displayAnswer: 'Asa', enumeration: [3], clueText: 'Parte da ave que se abre para o voo.' },
  ],
};
