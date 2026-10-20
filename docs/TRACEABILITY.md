# TRACEABILITY — requisito → owner → guia → prova

**ID:** ENT-TRACE-001 | **Observação:** arquivos e testes abaixo são **alvos planejados**. Esta matriz NÃO significa que a implementação ou os testes já existam.

| Requisito P0 | Módulo dono | Guia | Prova mínima |
|---|---|---|---|
| Lexemas acentuados / expressões | `domain/normalization.ts` | 01 | NOR-01..04 |
| Schema/editorialStatus/provenance | `content/schemas.ts` | 01, 03 | schema parse + EDI-01/04 |
| Motor sem sobreposição inválida e sem palavras-fantasma | `domain/grid.ts`, `editorial/generator` | 02 | GRD-01..08 |
| Fonte aberta com licença válida | `editorial/ingest` | 03 | EDI-01 + licença revisada |
| Literatura, cinema, TV, música, games | `editorial/ingest`, Wikidata | 03, 06 | amostras de corpus com QID e tema, verificação editorial |
| Gemini apenas privado | `editorial/clues` | 03, 07 | scan de bundle, EDI-02/03, nenhum fetch cliente |
| Pistas aprovadas por humano | `editorial/verification`, `publish` | 03, 06 | EDI-04 + revisão verdadeira registrada |
| Dia Recife / virada / calendário | `domain/daily.ts` | 04 | DAT-01..03; STR-06 |
| Streak idempotente somente diário | `domain/streak.ts` | 04 | STR-01..07 |
| Livre ilimitado com repetição honesta | `domain/free-play.ts` | 04 | SEL-01/02 |
| Shared cells e check solution | `domain/session.ts` | 04, 05 | GRD-05; SOL-01/02; E2E |
| localStorage resiliente/multiabas | `storage/*` | 04 | STO-01..04 |
| Home com diário + CTA livre | `features/home` | 05 | RTL/E2E home |
| Grade, pistas, teclado e touch | `features/crossword` | 05 | E2E 320/390/768/1440 + teclado |
| Resultado, ajudas, estatísticas | `features/crossword`, `features/stats` | 05 | E2E resultado e stats |
| Acessibilidade, focus e motion | `components/*`, `styles/*` | 05, 07 | audit WCAG/Apple HIG + E2E |
| Manifest imutável, hashes e horizontes | `content/catalog-loader`, `editorial/publish` | 06 | CAT-01/02 |
| 30 diários + 60 livres aprovados | `public/catalog/*` | 06 | `catalog:validate` + revisão humana |
| Calibração humana Malu | relatório editorial local | 06, 07 | 10 puzzles piloto + feedback |
| Build e regressão completa | `tests/*`, scripts | 07 | lint/typecheck/test/build/catalog checks |
| Preview + produção aprovada | Vercel/GitHub | 08 | URL real, smoke, autorização |

## Gate de divergência

Se um requisito aqui não tiver teste real após a guia implementadora, o Consistency Gate **falha**. Não criar teste superficial só para marcar checkbox; evidência deve verificar o comportamento descrito em `SPEC.md`.
