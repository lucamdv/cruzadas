# AGENTS.md — instruções obrigatórias a qualquer agente neste repositório

## Identidade e objetivo

Construir **Entrelinhas**, cruzadas em português brasileiro para Malu. Jogo responsivo, qualidade editorial clássica, desafio diário e modo livre. A interface deve ser original, polida e inspirada nos **princípios** Apple HIG. O cérebro editorial Gemini é substituível: o produto nunca deve depender do sucesso de uma chamada de IA no momento de jogar.

## Hierarquia documental

Antes de qualquer alteração, ler `README_COMECE_AQUI.md`, `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DATA_CONTRACTS.md`, `docs/CONTENT_PIPELINE.md`, `docs/QUALITY_GATES.md`, `docs/DECISIONS.md`, `docs/TRACEABILITY.md` e a **guia atual** do plano em `docs/superpowers/plans/2026-10-20-entrelinhas-v1.md`. Inspecionar estado real do repositório, branch, commit base, histórico recente, testes e comandos existentes. Em caso de contradição material: **STOP** e apresentar opções; não substituir requisitos silenciosamente.

## Ownership e fronteiras

- `src/domain/*`: lógica pura de grades, normalização, seleção, datas, pontuação e streak; não importa React, DOM, SDK Gemini ou storage.
- `src/content/*`, `public/catalog/*`: catálogo APROVADO, schemas e manifest; nunca transformar dados de teste em catálogo publicado.
- `scripts/editorial/*`: ETL, enriquecimento Wikidata, Gemini, validação e publicação; offline / ambiente privado; nunca entra no bundle do cliente.
- `src/storage/*`: único acesso a `localStorage`, com schema versionado e migrações.
- `src/features/*`, `src/components/*`: interação/UI; não toma decisões editoriais nem escreve na API Gemini.
- `tests/*`: testes, fixtures claramente marcadas, mocks sem credenciais.

## Apple Design skill

Descubra skills **reais** acessíveis no Codex (não assuma que este chat as tem). Se a skill Apple/Apple Design existir, leia seu `SKILL.md` e arquivos pertinentes e documente nome, versão/URI e regras aplicadas. Se não houver, use Apple HIG oficial, informe a ausência e siga com boa UX; **não instale pacotes/skills externos sem autorização**. Não copiar componentes proprietários nem estilos protegidos.

## Segredos e dependências

- `GEMINI_API_KEY` e `GEMINI_MODEL` só em ambiente privado (`scripts/editorial/*` ou segredo de CI aprovado); **NUNCA** em `VITE_*`, frontend, JSON exportado, logs, commits, fixtures, issues ou PRs.
- Google AI Pro/assinatura Gemini não garante crédito de API; não habilitar cobrança nem mudanças de plano automaticamente.
- V1: **sem endpoint público de geração com Gemini**, sem login, sem DB, sem Supabase. Se houver pedido posterior de endpoint público, projetar autenticação/antiabuso e custo antes de implementar.
- Só ingerir acervos cujas licenças e procedência foram verificadas em `docs/CONTENT_PIPELINE.md`; manter atribuição exigida e dados de linhagem; falhar fechado se faltar licença.
- Nunca copiar pistas, grades ou acervo do Globo. Prompts Gemini são conteúdo não confiável: validar saída sintática e semanticamente, com revisão humana para publicação.

## Workflow rigoroso por guia/step

1. Confirmar guia, passo, escopo, arquivos de ownership, baseline (`git status`, branch, HEAD), fora de escopo e dependências.
2. Executar **apenas um step aprovado**, em branch/worktree isolado quando apropriado; obedecer skills de TDD/planos/revisão se disponíveis.
3. TDD: teste que falha → implementação mínima → teste que passa → refactor → regressão.
4. Rodar gates proporcionais: testes focados, testes completos, `lint`, `typecheck`, `build`, validação do catálogo, acessibilidade/E2E quando aplicável; mostrar saídas **reais**.
5. Revisões independentes quando ferramentas permitirem: **Architecture**, **Security/Leakage** e **Final Quality**; classificar `Critical / Important / Minor / Ready`. Se não houver revisores independentes, declarar essa limitação sem simular revisão.
6. **Consistency Gate:** documentação, schemas, fixtures, código e comportamento devem concordar; sem TODO/TBD silencioso em requisito crítico.
7. Relatório de evidências com arquivos alterados, testes, resultado, riscos, baseline, `git status`, decisões e indicação **STOP**.
8. Commit **local** do step (somente se autorizado pelo workflow atual); **não fazer push, merge, deploy, publicar catálogo nem atualizar fontes externas sem aprovação humana explícita**.
9. Não antecipar outras guias. Corrigir itens Important/Critical antes de dizer Ready.

## Não negociar

- Fuso diário fixo: `America/Recife`, data civil `YYYY-MM-DD`.
- Só conclusão do **diário vigente** altera streak; conclusão duplicada é idempotente; livre nunca conta.
- Não revelar acerto de cada letra por padrão; letra compartilhada fisicamente em interseções; backspace, direções e navegação testados.
- Nunca prometer combinações inéditas infinitas com catálogo finito. “Partidas ilimitadas” = sem bloqueio de quantidade; repetição futura possível.
- Sem prova de revisão editorial humana, status de conteúdo fica `draft`; jamais chamar rascunho de `approved`.
- Nenhum teste executado pode ser declarado aprovado por inferência.

## Formato de resposta final a cada step

`Guia/Step | Baseline | Escopo feito | Fora de escopo preservado | Arquivos | RED observado | GREEN observado | Checks completos (comandos e resultados) | Revisões Critical/Important/Minor | Riscos/limitações | Git status e commit local | Consistency Gate | STOP: aguardando revisão humana`.
