# QUALITY GATES — padrão ELMO adaptado ao Entrelinhas

**ID:** ENT-QA-001 | **Versão:** 1.0.0 | **Política:** evidência real > afirmação; implementação incremental; ausência de revisor independente não pode ser ocultada.

## 1. Workflow de cada guia

```text
Documentos frescos + Baseline Git
       ↓
Escopo e fora de escopo + interfaces
       ↓
TDD RED (evidência de falha por comportamento esperado)
       ↓
Implementação mínima → GREEN → refactor
       ↓
Testes focados → Integração → Regressão completa
       ↓
Review Architecture + Security/Leakage + Final Quality
       ↓
Consistency Gate (code × schemas × docs × fixtures)
       ↓
Commit LOCAL → relatório com evidências → STOP
       ↓
Aprovação humana explícita → push/continuação
       ↓
Deploy / atualização catálogo só em guia autorizada
```

Cada step precisa dizer: *input e estado esperado; arquivo dono; baseline; testes que falharam antes, testes que passaram depois; comandos exatos; reviews; pendências; git status; próximo passo*. Não esconder testes não executados. Se revisão humana rejeitar, voltar ao passo antes de marcar a guia aceita.

## 2. Tipos de gate

| Gate | Quando | Evidência exigida |
|---|---|---|
| Baseline | Antes de tocar código | `git status --short`, branch, HEAD e teste baseline existente |
| Unit/contract | Cada função de domínio, storage e schema | Testes RED→GREEN, bordas e contratos |
| Integration | Componentes com estado, catálogo e storage | Comportamento conjunto, erros, múltiplos eventos |
| UX/Accessibility | Qualquer alteração visível | Mobile/desktop, teclado/touch, foco e leitor de tela |
| Editorial | Toda alteração em fontes, pistas, grade ou manifest | Licença, provenance, revisão humana, validadores, distribuição |
| Security/Leakage | SDK/env/CI, releases e alterações de fronteira | Ausência de secrets/client Gemini, source trust, dependências |
| Regression | Fechamento de guia, release | `lint`, `typecheck`, `test`, `build`, `catalog:validate` quando aplicável |
| Consistency | Cada guia e release | SPEC/ADR, contratos, testes, assets e comportamento coerentes |
| Guide Acceptance | Antes de ir à próxima | Documento de evidências + sem Critical/Important |
| Release | Preview→produção | catálogo 30 diários/60 livres, teste humano, URL preview, autorização |

## 3. Comandos alvo

Criar scripts no `package.json` quando o setup Vite existir. Até lá, comandos são **esperados**, não alegados como já implementados.

```bash
npm run lint
npm run typecheck
npm run test -- --run
npm run build
npm run catalog:validate
npm run test:e2e
npm run editorial:check-licenses
```

Se algum script não existir ainda na GUIA atual, declarar **N/A ainda não implementado** e não apresentar como PASS. CI de release exige todos os scripts declarados na versão final e saídas recentes. Fazer smoke real após deploy Preview e scanner de bundle para `GEMINI_API_KEY`, `AIza` e strings de chaves potenciais, com saneamento dos relatórios (não imprimir segredos encontrados).

## 4. Matriz mínima de testes — domínio

| ID | Caso | Esperado |
|---|---|---|
| NOR-01 | `Coração` | `CORACAO` |
| NOR-02 | `São Paulo` | `SAOPAULO`, enumeração `[3,5]` |
| NOR-03 | `água-de-coco` | `AGUADECOCO`, enumeração `[4,2,4]` |
| NOR-04 | emoji/dígito/palavra vazia | rejeição explícita |
| GRD-01 | cruzamento com letras distintas | validador rejeita |
| GRD-02 | palavra fora da grade | rejeita |
| GRD-03 | componentes desconectados | rejeita |
| GRD-04 | sequência acidental não cadastrada | rejeita |
| GRD-05 | dois sentidos compartilhando a mesma célula | digitação altera uma letra física |
| GRD-06 | pista órfã ou resposta de comprimento errado | rejeita |
| GRD-07 | seed e corpus fixos | geração reprodutível |
| GRD-08 | sem candidato válido | falha tipada, não substituto inválido |
| DAT-01 | `2026-10-20T23:59:59-03:00` | dateKey `2026-10-20` |
| DAT-02 | `2026-10-21T00:00:01-03:00` | dateKey `2026-10-21` |
| DAT-03 | entorno de ano bissexto e mudança de ano | `addCivilDays` correto |
| STR-01 | primeira conclusão diária hoje | current=1 |
| STR-02 | ontem + hoje | current=2 |
| STR-03 | repetir mesma conclusão hoje | nenhum incremento |
| STR-04 | completar livre | streak imutável |
| STR-05 | só concluiu anteontem | display current=0, best preservado |
| STR-06 | dia virou com diário em andamento | não creditar conclusão retroativa |
| STR-07 | histórico desordenado/com datas duplicadas | cálculo deduplica e ordena |
| SEL-01 | catálogo com variedade suficiente | evitar últimos 10 IDs |
| SEL-02 | todos livres já vistos | permitir repetição, `repeated=true` |
| STO-01 | parse inválido/Schema desconhecido | fallback seguro + alerta, sem crash |
| STO-02 | storage bloqueado/cheio | sessão efêmera, UX compreensível |
| STO-03 | aba A e aba B concluem diário | conclusão única, merge sem duplicar |
| STO-04 | sessão de puzzle ID antigo | não abrir grade de outro ID silenciosamente |
| SOL-01 | letras preenchidas mas erradas | não concluir |
| SOL-02 | revelar letra / conferir palavra | incrementa contador adequado; `assisted` conforme regra |
| EDI-01 | fonte sem licença validada | bloqueio de importação/publicação |
| EDI-02 | Gemini retorna JSON válido, fato errado | bloqueio editorial humano |
| EDI-03 | pista inclui resposta em texto/variante | rejeita |
| EDI-04 | sem `reviewer` humano | `editorial_approved` proibido |
| CAT-01 | data duplicada ou hash inválido | build editorial falha |
| CAT-02 | menos de 30 datas consecutivas a partir da estreia (inclusive) no release | bloqueia release |

## 5. Matriz de UX/E2E

1. **Mobile 320/375/390 px:** grade acessível, sem scroll horizontal de página; pista atual legível com teclado aberto, alvos tocáveis; alternar direção numa célula comum sem perder letras.
2. **Tablet 768/desktop 1440:** lista de pistas e grade coerentes; navegação Tab/Shift+Tab, setas, Backspace, foco visível.
3. **Long press não obrigatório:** nenhuma interação depende exclusivamente de mouse/hover. Teclado virtual não provoca zoom involuntário no iOS.
4. **Acessibilidade:** testar `prefers-reduced-motion`, 200% zoom, contraste, descrições, comunicação de erros e anúncios de conclusão com leitor de tela.
5. **Retomada:** digitar, reload, voltar; letras/tempo/ajudas persistem. Storage bloqueado oferece aviso; não perda silenciosa.
6. **Diário expirado:** manter aba aberta durante virada; sistema detecta e impede atribuição incorreta ao streak.
7. **Catálogo indisponível:** tela honesta, botão tentar novamente e jogo livre apenas se houver assets carregados.
8. **Conquista:** finalizar corretamente após ajudas; `assisted` verdadeiro e streak diária conta uma vez.
9. **Sem spoilers:** testes verificam ausência de verificação visual instantânea de letras erradas.

## 6. Rodada editorial com Malu

Não alegar “dificuldade Globo” apenas por ter pedido isso ao Gemini. Aplicar **10 puzzles piloto** e registrar, com consentimento, indicadores mínimos: tempo aproximado, nº de ajudas, nº de pistas consideradas injustas, dificuldade percebida numa escala de 1–5, repetição notada, experiência teclado/grade. Não coletar dados online nem identificação; formulário/observação manual suficiente.

**Aceite recomendado:** 0 pistas factualmente incorretas ou impossíveis; média subjetiva de dificuldade entre 3 e 4,5/5 para Malu, sem maioria de reclamações por pistas injustas; nenhum bloqueio de jogabilidade no dispositivo-alvo. Caso falhe, revisar conteúdo e UX — não elevar dificuldade apenas colocando palavras raras.

## 7. Reviews e severidades

- **Architecture:** fronteiras, determinismo, consistência de contratos, modularidade e complexidade desnecessária.
- **Security/Leakage:** secrets, SDK no client, CORS/endpoints, payloads, segurança de imports, licença, ataques via saída LLM, supply chain.
- **Final Quality:** requirements coverage, bugs, acessibilidade, performance, design, conteúdo e testes.
- **Critical:** risco claro de comprometimento/dados, quebra central ou publicação impossível → **STOP**.
- **Important:** falha significativa de requisito, UX principal, teste ou evidência → **STOP**.
- **Minor:** melhoria pontual que pode ser rastreada, com justificativa, sem mascarar defeito.
- **Ready:** somente quando não houver Critical/Important e gates pertinentes estiverem aprovados.

Sem subagente independente disponível? Fazer self-review documentado e registrar **“review independente indisponível”**, sem inventar resultado.

## 8. Consistency Gate (antes de marcar READY)

- [ ] Nomes de interfaces/estados/keys em `DATA_CONTRACTS.md` batem com código e testes.
- [ ] Status de acervo público confere com `CONTENT_PIPELINE.md`; nenhuma licença presumida.
- [ ] Todo cenário P0 do SPEC aponta para caso de teste + guia implementadora.
- [ ] Fixtures de desenvolvimento identificadas e excluídas de `public/catalog/`.
- [ ] `daily`/`free`/`streak` concordam entre domínio, UI e storage.
- [ ] Política Gemini privada confirmada no bundle; sem endpoint público escondido.
- [ ] Sem comentário TODO/TBD relacionado a requisito crítico sem issue/decisão.
- [ ] `git diff --check`, `git status --short`, testes e builds no HEAD atual registrados.
- [ ] Evidência de dados reais (onde aplicável) não é confundida com teste/mocks.

## 9. Modelo de relatório STOP

```markdown
# GUIDE REPORT — Guia XX / Step YY
- Baseline: branch ___, commit ___, git status antes ___
- Escopo autorizado: ___ | Fora de escopo respeitado: ___
- Arquivos criados/alterados: ___
- TDD RED: comando ___; falha observada ___
- TDD GREEN: comando ___; passou ___
- Verificações: <comando> → PASS/FAIL/N/A, motivo
- Reviews: Architecture __, Security/Leakage __, Final Quality __
- Consistency Gate: PASS/FAIL + evidências
- Riscos e limitações: ___
- Git: diff, status, commit local (se autorizado) ___
- Status: READY / BLOCKED
- STOP: aguardando revisão e autorização humana para continuar/push/deploy
```
