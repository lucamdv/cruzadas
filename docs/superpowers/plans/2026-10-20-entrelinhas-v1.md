# Entrelinhas V1 — Implementation Plan (GUIAS 01–08)

> **For agentic workers:** REQUIRED SUB-SKILL if available: use `superpowers:subagent-driven-development` (preferencial) ou `superpowers:executing-plans`; implementar apenas a guia/step autorizado. Se não disponível no Codex, manter o workflow TDD/verification especificado, documentando a ausência.

**Goal:** site de palavras cruzadas pt-BR responsivo, diário com streak e livre sem limites de sessões, conteúdo cultural amplo, Gemini editorial privado, revisão humana, deploy estático Vercel.

**Architecture:** corpus público com proveniência e licença → gerador determinístico → Gemini produz pistas candidatas → validação automática + aprovação humana → catálogo estático imutável → React SPA com domínio puro e `localStorage` versionado.

**Tech Stack:** React, TypeScript strict, Vite, Vitest, Testing Library, Playwright, Zod (ou validador equivalente aprovado), Node `@google/genai` somente em scripts editoriais, Vercel estática.

**Spec:** `docs/SPEC.md`; conferir `ARCHITECTURE.md`, `DATA_CONTRACTS.md`, `CONTENT_PIPELINE.md`, `QUALITY_GATES.md` e `DECISIONS.md` antes de executar.

## Global Constraints

- `pt-BR`; `America/Recife` para dia; `YYYY-MM-DD` canônico.
- Diário imutável por data/ID; somente diário vigente concluído conta no streak; livre não conta.
- Respostas canônicas letras `A–Z` sem acento, mantendo `displayAnswer` e enumeração.
- Não há verificação automática certo/errado por tecla; só conferência ou finalizar explícitos.
- Livre sem limite de sessões; garantir seleção honesta quando acervo finito repetir.
- Nenhum segredo no `src`, `public` ou bundle; `GEMINI_API_KEY` privado e scripts Node apenas.
- Sem Gemini público, DB, login, Supabase, pagamento ou deploy de produção antes de pedido explícito.
- Nada rotulado editorialmente aprovado sem verificação humana, licença e rastreabilidade.
- Regras de domínio puras, JSON validado em runtime e catalog manifest estável.
- Cada step executado como RED → GREEN → refactor → testes → reviews → Consistency Gate → STOP.

## Review Focus — cinco riscos de campo

1. **Meia-noite Recife, aba aberta:** o diário muda de data; não creditar a sessão expirada. Testes `DAT-02`, `STR-06` na GUIA 02/04.
2. **Acentos e expressões:** `São Paulo` vira `SAOPAULO`, enumeração `[3,5]`, sem truncamentos. Testes `NOR-02/03` na GUIA 01.
3. **Entrada de teclado virtual em interseção:** nenhuma letra duplicada, foco estável, seleção H/V previsível. Testes `GRD-05`, UX mobile GUIA 05.
4. **Catálogo/puzzle alterado durante uma sessão:** continuar ID fixo ou avisar; não converter progresso de outra grade. Testes `STO-04`, `CAT-01` GUIA 04/06.
5. **Licença ou pista fictícia passadas como prontas:** pipeline falha fechado; nenhum `editorial_approved` por mock. Testes `EDI-01/04` e gate GUIA 03/06.

---

## GUIA 01 — Fundação, contratos e normalização

**Objetivo verificável:** projeto abre, compila, tem testes e contratos essenciais de respostas/dados tipados, sem jogo visual fake nem dependência de Gemini.

**Ownership:** `package.json`, `tsconfig*.json`, `vite.config.ts`, `src/content/schemas.ts`, `src/domain/normalization.ts`, `tests/unit/normalization.test.ts`, `tests/unit/schemas.test.ts`, configuração testes, `.gitignore`, `.env.example` (já existe; não preencher).

**Out-of-scope:** home definitiva, grade, streak, Gemini real, fontes baixadas, Vercel.

**Interfaces:** `normalizeAnswer(displayAnswer):string`, `buildEnumeration(displayAnswer):number[]`, esquemas `LexiconEntry`/`CrosswordPuzzle`/`CatalogManifest`/`PersistedStateV1` iguais aos `DATA_CONTRACTS.md`.

- [ ] **Step 01.1 — Baseline e bootstrap isolado:** verificar docs, skills Apple/Superpowers, branch/worktree, HEAD, scripts atuais. Criar Vite React TS strict, testes Vitest/RTL, lint e typecheck (minimal; sem UI final). Teste smoke que renderiza entrada do app com label acessível e falha antes da implementação.
- [ ] **Step 01.2 — Normalização RED:** adicionar `NOR-01/02/03/04` como testes focados; executar `npm run test -- --run tests/unit/normalization.test.ts` e registrar RED.
- [ ] **Step 01.3 — Normalização GREEN:** implementar somente as duas funções; rodar teste focado, `typecheck`, `lint`, `build` e revisar casos Unicode/segurança; manter scripts idempotentes.
- [ ] **Step 01.4 — Schemas RED→GREEN:** testar falta de `reviewer`, `gridRows` inválidos e dados de storage incompatíveis; criar schemas em arquivo dono; rodar test, typecheck, lint e build.
- [ ] **Step 01.5 — Guide Acceptance:** registrar baseline/diff/execução dos checks; reviews Architecture/Security/Final Quality, Consistency Gate, commit LOCAL se autorizado, STOP.

**Aceite:** normalização e enumeração exatas; typing e parse de schemas funcionando; sem segredo ou SDK Gemini no bundle; testes e build passam no HEAD; nenhuma fixture confundida com catálogo real.

## GUIA 02 — Motor de grade determinístico

**Objetivo:** gerar/validar grades de palavras cruzadas a partir de corpus de teste com integridade física, seed estável e mensagens de falha tipadas.

**Ownership:** `src/domain/grid.ts`, `scripts/editorial/generator/*`, `tests/unit/grid.test.ts`, `tests/editorial/generator.test.ts`, fixtures pequenas.

**Out-of-scope:** Gemini, fontes públicas, qualquer marca visual, streak.

**Interfaces:** `validatePuzzle(CrosswordPuzzle):ValidationResult`; `generateGrid({entries, seed, options}):GeneratedLayout|GenerationFailure`. `GeneratedLayout` é interno de pipeline antes de pistas; nunca falsificar `CrosswordPuzzle` aprovado.

- [ ] **Step 02.1 — RED:** casos `GRD-01/02/03/04/06/07/08` para colisão, fora da grade, componente desconectado, sequência fantasma, pista órfã, reprodutibilidade e corpus insuficiente.
- [ ] **Step 02.2 — GREEN validador:** implementar invariante de coordenadas, letras, blocos, palavra fantasma, conectividade, ≥2 cruzamentos por entrada, `checkedCellRate >=0.65`; explicar rejeições estruturadas.
- [ ] **Step 02.3 — RED→GREEN gerador:** backtracking/beam search limitado por seed, opções, timeout; falhar tipado em vez de publicar grade ruim. Criar teste de property/invariantes sobre múltiplas seeds e corpus de fixture.
- [ ] **Step 02.4 — Smoke + review:** exportar grade em formato textual de debug, validar saída pelo mesmo validador, test/build/review/Consistency Gate. STOP.

**Aceite:** nenhuma letra contraditória, nenhuma entrada desconectada ou palavra fantasma, mesma seed/mesmo corpus mesma saída, falha legível quando não há grade satisfatória.

## GUIA 03 — Acervos licenciados, cultura pop/literatura e Gemini editorial privado

**Objetivo:** pipeline rastreável de ingestão, geração de 3 pistas candidatas por palavra e revisão humana, sem publicar dados incertos nem vazar chave.

**Ownership:** `scripts/editorial/ingest/*`, `scripts/editorial/clues/*`, `scripts/editorial/verification/*`, `scripts/editorial/publish/*` conforme subetapas, `tests/editorial/*`, manifest de fontes e prompts versionados.

**Out-of-scope:** Gemini cliente, Function pública, novas telas. Sem download de corpus que não passe licença/proveniência.

**Interfaces:** `ClueProvider.generateCandidates(ClueRequest[]):Promise<ClueCandidate[]>`; `GeminiClueProvider` privado; `Provenance`, `LexiconEntry`, `ClueCandidate` canônicos; `licenseAllowlist` auditável.

- [ ] **Step 03.1 — Fonte e licença:** registrar Wikidata CC0 como candidato cultural prioritário, fserb/OWN-PT/Kaikki/palavras conforme checklist de licença. Testar que fontes sem `licenseVerified` falham fechadas; decidir quais podem de fato ser importadas após inspeção.
- [ ] **Step 03.2 — ETL RED→GREEN:** ingestão com snapshot pinado, dedupe de termo+sentido, preservação de grafia e enumeração, QIDs, categorias pop/literatura; testar entradas ruins, dados faltantes e fontes conflitantes.
- [ ] **Step 03.3 — Mock Gemini RED→GREEN:** adapter `ClueProvider` e schema de saída; testes mock de JSON inválido, vazamento da resposta, timeout/retry, perda de conexão, idempotência. Não usar API paga nos testes/CI.
- [ ] **Step 03.4 — Gemini real controlado:** só com chave configurada **pelo dono no ambiente privado** e autorização da guia; testar com lote pequeno e confirmar que nenhum log/arquivo público/bundle contém segredo; registrar token/requests sem expor dados privados.
- [ ] **Step 03.5 — Review humano/arquivo editorial:** implementar interface simples CLI/arquivo de revisão, trilha de revisão; testar impossibilidade de marcar `editorial_approved` sem reviewer/timestamp. Registrar exemplos de pistas aprovadas pela pessoa, não pelo modelo.
- [ ] **Step 03.6 — Gate editorial:** rodar scripts de licença, pistas e fontes, reviews independentes (se disponíveis), consistency gate e STOP.

**Aceite:** referências verificáveis para perguntas factuais; variedade lexical e cultural; geração Gemini só privada; nenhuma publicação automática de rascunhos; trilha editorial reproduzível.

## GUIA 04 — Domínio diário, streak, livre e storage

**Objetivo:** regras completas e resilientes de calendário, streak, seleção de modo livre e autosave, testadas sem UI.

**Ownership:** `src/domain/daily.ts`, `streak.ts`, `free-play.ts`, `session.ts`, `src/storage/repository.ts`, `migrations.ts`, tests correlatos.

**Out-of-scope:** aparência final, IA runtime, conta/sync.

**Interfaces:** `getRecifeDateKey`, `addCivilDays`, `calculateStreak`, `canCompleteDaily`, `selectFreePuzzle`, `applyLetter`, `checkSolved`, `loadState`, `saveState`, migração `PersistedStateV1`.

- [ ] **Step 04.1 — RED data/streak:** casos `DAT-01/02/03`, `STR-01..07`, garantir idempotência, dedupe e clock boundary.
- [ ] **Step 04.2 — GREEN data/streak:** implementação puro domínio com `Intl.DateTimeFormat`, ordinal de dia e sem offset do aparelho; executar teste focado/regressão.
- [ ] **Step 04.3 — RED→GREEN livre e sessão:** casos `SEL-01/02`, `GRD-05`, `SOL-01/02`, seleção sem cota e escolha repetida sinalizada; células compartilhadas e cronômetro ativo.
- [ ] **Step 04.4 — RED→GREEN storage:** `STO-01..04`, schema guard, migração, `storage` event multiabas, QuotaExceeded e fallback em memória. Sem apagar progresso sem explicação.
- [ ] **Step 04.5 — Guide Acceptance:** review invariantes por multiabas, reload e clock; status de scripts; Consistency Gate e STOP.

**Aceite:** streak correto na virada e no mesmo dia, livre não soma, reload salva, dados malformados não derrubam site, não troca puzzle silenciosamente.

## GUIA 05 — Design system Apple-inspired e experiência de jogo

**Objetivo:** interface utilizável, bonita e acessível em mobile e desktop; sem introduzir mecânicas fora de SPEC.

**Ownership:** `src/styles/*`, `src/components/*`, `src/features/home/*`, `src/features/crossword/*`, `src/features/stats/*`, `src/app/*`, testes RTL/E2E pertinentes.

**Out-of-scope:** conteúdo fictício como real, pistas Gemini ao vivo, desafio extra/dificuldades diferentes.

**Interfaces:** UI consome `CrosswordPuzzle`, `GameSession`, ações puras de `domain` e `storage` via camada adaptadora; conteúdo carregado por `catalog-loader`.

- [ ] **Step 05.1 — Skill/HIG e protótipo:** listar Apple skill real ou ausência, tokens (cor, tipografia, spacing), fluxos e estados da UI; registrar comparação de mobile/desktop para aprovação antes de refinamento.
- [ ] **Step 05.2 — Home RED→GREEN:** estado diário, CTA livre, streak, link estatísticas e informação de storage; RTL e screenshot mobile/desktop.
- [ ] **Step 05.3 — Tabuleiro RED→GREEN:** grade, seleção H/V, input/backspace/tab/teclado virtual, pista ativa e foco; adicionar `GRD-05` de interação real, e2e iPhone/Android viewport, sem verificação automática letra-a-letra.
- [ ] **Step 05.4 — Resultado/ajuda/stats RED→GREEN:** conferir palavra, revelar letra, finalizar corretamente, assistência, cronômetro de tempo ativo, histórico visual.
- [ ] **Step 05.5 — Audit HIG:** 320/375/390/768/1440, leitor de tela, teclado, zoom 200%, reduced motion, contraste, foco e toque; corrigir bloqueios.
- [ ] **Step 05.6 — Guide Acceptance:** screenshot documentada, testes UI/E2E, reviews, Consistency Gate, STOP.

**Aceite:** Malu pode resolver cruzada completa no celular, sem perda de seleção/teclado, interface coerente e bonita; código e visual originais.

## GUIA 06 — Catálogo real, diário imutável e publicação editorial

**Objetivo:** integrar loader e manifest, publicar conteúdo aprovado e provar validade quantitativa e qualitativa.

**Ownership:** `src/content/catalog-loader.ts`, `public/catalog/*`, `scripts/editorial/publish/*`, testes integração/editorial, `ATTRIBUTION.md`.

**Out-of-scope:** deploy em produção, publicação de mocks ou novas fontes sem autorização.

- [ ] **Step 06.1 — RED catálogo:** `CAT-01/02`, manifest imutável, hash, schema, reviewer, diário sem data duplicada, contagens mínimas.
- [ ] **Step 06.2 — GREEN publicação:** criar publisher e loader robustos; mostrar erro honesto se falha; preservar IDs de sessões antigas.
- [ ] **Step 06.3 — Piloto editorial:** **10 puzzles** com edição e aprovação humana verdadeira, pré-verificação estrutural. Rodar partida real com Malu e rubricar pistas; registrar ajustes.
- [ ] **Step 06.4 — Catálogo V1:** expandir até **30 diários + 60 livres** aprovados; todos passam `catalog:validate`, licença/atribuição e revisão manual. Não preencher contagem com cópias exatas ou mocks.
- [ ] **Step 06.5 — Guide Acceptance:** consistência de manifest/data, prova de 30 datas consecutivas incluindo a estreia; reviews e STOP.

**Aceite:** 100% de puzzles publicados aprovados e válidos, sem conteúdo proprietário, fontes creditadas e data→puzzle estável.

## GUIA 07 — Regressão completa, acessibilidade e segurança

**Objetivo:** transformar um MVP funcional em release candidato sem defeitos críticos/importantes.

**Ownership:** `tests/e2e/*`, melhorias pontuais em arquivos donos, scripts de CI/scan de secrets, relatórios locais (ignorados no Git se conterem dados sensíveis).

**Out-of-scope:** adicionar funcionalidades não solicitadas por entusiasmo.

- [ ] **Step 07.1 — Regression RED→GREEN:** automatizar smoke diário/livre, reload, virada, falha de catálogo e localStorage, mobile/desktop, saída esperada.
- [ ] **Step 07.2 — Security/Leakage:** escanear repositório e bundle de secrets, tokens e Gemini client calls, checar licenças; sem endpoint público; registrar dependências e acessos de rede reais.
- [ ] **Step 07.3 — UX e perf:** Lighthouse/axe/inspeção visual (se disponíveis), layout/teclado/zoom, crash recovery; estabilizar problemas de Major/Important.
- [ ] **Step 07.4 — Consistency Gate:** matrix SPEC→tests→files, 0 Critical/Important, rebuild no HEAD; relatório STOP.

**Aceite:** documentação, catálogo e app coerentes e verificações reais passando. Não chamar de “zero bugs” sem evidência.

## GUIA 08 — Vercel preview e publicação autorizada

**Objetivo:** publicar somente depois de validação final e autorização do proprietário.

**Ownership:** config Vercel quando necessária, README de deploy e smoke do site. Sem novas arquiteturas.

- [ ] **Step 08.1 — Preflight:** confirmar conta/escopo Vercel, repositório, branch/commit exato, scripts, catálogo, `.env` ausente do bundle e atribuições legais.
- [ ] **Step 08.2 — Preview:** conectar projeto GitHub→Vercel somente com autorização; deploy preview; testar URL real sem credenciais, fluxo completo iPhone/desktop, assets e state persistence; registrar evidência e status.
- [ ] **Step 08.3 — Produção:** **pedir autorização separada** após preview. Se aprovada, publicar commit revisado no projeto/domínio confirmados; smoke de produção, rollback plan e checklist para atualizar catálogo antes do fim dos 30 dias.
- [ ] **Step 08.4 — Closure:** relatório final com status do release, commit/deployment URLs reais, riscos operacionais, review e STOP/closed mediante aprovação humana.

**Aceite:** site acessível, catálogo e streak corretos em browser real, sem secrets expostos, e URL/custos/permissões confirmados.

---

## Checklist de fechamento de cada guia

- [ ] Baseline + escopo/fora de escopo + ownership documentados.
- [ ] Todos os steps da guia têm teste RED→GREEN (ou motivo verificável de N/A em trabalho documental).
- [ ] Comandos executados e resultados preservados; não fabricar PASS.
- [ ] Reviews Architecture, Security/Leakage, Final Quality classificados.
- [ ] Consistency Gate PASS; não há Critical/Important.
- [ ] Commit local com diff auditável, se autorizado; status Git documentado.
- [ ] Relatório entregue e **STOP**; não começar guia seguinte sem aprovação.

## Dependências entre guias e ordem

`01 Fundação → 02 Motor → 03 Editorial → 04 Regras/persistência → 05 UI → 06 Catálogo real → 07 QA → 08 Release`.

Embora as guias tenham interações, **não** antecipar dependências apenas para demonstrar uma feature. Se a equipe desejar mudar ordem, registrar ADR e atualizar plano/contratos antes de codificar.
