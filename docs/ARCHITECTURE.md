# ARCHITECTURE — Entrelinhas V1

**ID:** ENT-ARCH-001 | **Versão:** 1.0.0 | **Estado:** projeto, não implementação | **Source of Truth:** `SPEC.md` + `DATA_CONTRACTS.md`

## 1. Princípio central

**O jogo é o produto; o provedor de pistas é substituível.** O Gemini auxilia a produção editorial, mas jamais possui autoridade sobre regras, tabuleiro, validação, persistência ou publicação. Separação inspirada em arquiteturas de produto robustas: motor puro → dados editoriais versionados → interface → armazenamento; pipeline externo isola IA, licença, fatos e revisão.

```text
           EDITORIAL (offline / privado)
 [Acervos públicos] ----> [Importadores + licença/proveniência]
                                     |
                             [Normalização + filtro]
                                     |
                            [Banco lexical canônico]
                                     |
                         [Algoritmo determinístico]
                                     |
                            [Grades candidatas]
                                     |
 [Gemini API -> JSON] ---> [Candidatas a pistas]
                                     |
                  [Validator estrutural / semântico]
                                     |
                    [Revisão editorial HUMANA]
                                     |
                       [Catálogo/manifest imutável]
                                     |
                REPOSITÓRIO / CI / VERCEL CDN
                                     |
      RUNTIME PÚBLICO (React SPA, sem Gemini nem API própria)
 [Loader de catálogo] -> [Domínio puro] -> [UI responsiva]
                                   <-> [localStorage versionado]
```

## 2. Topologia e deploy

- Código React/TS/Vite compila para arquivos estáticos. Vercel hospeda assets e `public/catalog/*` via deploy do GitHub (somente após aprovação da GUIA 08).
- `scripts/editorial/*` é ferramenta local/CI protegida para manter catálogo. Importadores podem exigir rede durante o desenvolvimento; importação falha sem conexão; não depende dessa rede para usuário jogar.
- Não criar nenhuma `api/generate` ou Function pública na V1. Se desenvolvimento exigir um serviço administrativo, use script privado primeiro. Endpoint futuro = **ADR próprio + autenticação real, abuse prevention distribuída, cotas e monitoramento**.
- Nenhuma chamada Gemini no navegador: carregamento de jogos deve funcionar sem contato com a API Google.
- Chave Gemini fica em `process.env.GEMINI_API_KEY` acessada somente por scripts Node não importados pelo `src/` nem disponibilizados em `public/`; `.env.local` ignorado.
- A data civil de referência do jogo é `America/Recife` (não inferir fuso nem geolocalização do usuário).

## 3. Fronteiras de módulo

```text
src/
  app/                 # roteamento/composição/providers puros de UI
  components/          # UI reutilizável, tokens e acessibilidade
  features/home/       # cards diário/livre
  features/crossword/  # tabuleiro/pistas/teclado/tela
  features/stats/      # estatísticas e calendário
  domain/normalization.ts
  domain/grid.ts
  domain/daily.ts
  domain/streak.ts
  domain/free-play.ts
  domain/session.ts
  content/catalog-loader.ts
  content/schemas.ts
  storage/repository.ts
  storage/migrations.ts
  styles/tokens.css
scripts/editorial/
  ingest/              # conectores de acervo + snapshots
  normalization/       # ETL, dedupe, index
  generator/           # backtracking/beam search + seed
  clues/               # ClueProvider port, GeminiAdapter, prompts
  verification/        # análise de pistas + fatos/proveniência
  publish/             # editorial flags, manifest, hash, preview
public/catalog/
  manifest.json
  daily/YYYY-MM-DD.json
  free/<puzzleId>.json
  ATTRIBUTION.md
fixtures/
  puzzles/             # APENAS fictícios para teste (não publicáveis)
tests/
  unit/
  integration/
  e2e/
  editorial/
```

É uma **organização alvo**, não uma declaração de que esses arquivos já existem. Criar apenas ao chegar na guia responsável. Minimizar dependências e não carregar snapshots gigantes dos dicionários na SPA.

## 4. Fluxo de publicação editorial

1. `ingest`: baixar/importar snapshot explícito de fonte autorizada; salvar origem, URL, versão/commit, data, licença conferida e `sourceId`.
2. `normalize`: formas pt-BR, palavras e expressões; manter `displayAnswer` e `canonicalAnswer`; bloquear palavras sujas, inválidas ou ambíguas sem contexto.
3. `enrich`: agregar relações factuais do Wikidata com `wikidataId` e propriedade de evidência; jamais presumir que metadados = pista automaticamente correta.
4. `generate-grid`: determinístico com seed + pool de entradas elegíveis; controles de colisão, conectividade e densidade; falha quando não houver boa grade.
5. `generate-clues`: `ClueProvider.generateCandidates` implementado por Gemini em lote; saída JSON com schema; `promptVersion` fixo; limites, retry com jitter, timeout e orçamento. Não usar `provider` dentro de `domain`.
6. `verify`: testes determinísticos de resposta vazada, enunciado, grafo da grade, palavras inválidas; checagens factuais/ambiguidade sinalizam revisão humana.
7. `review`: humano vê solução, pistas, fontes, dificuldade, alertas e aprova/rejeita; registrar `reviewer`, timestamp e revisão para auditoria. `auto_checked` **não vira** `approved` por conveniência.
8. `publish`: gerar arquivos imutáveis, `catalogVersion`, mapeamento date→id e atribuição de fontes. Gate impede publicação se houver duplicata de id/data, falta revisão, licença ou cruzamentos incorretos.

### 4.1 Reprodutibilidade

- IDs baseados em hash canônico (`puzzleId`) ou UUID persistido no artefato editorial; determinismo de seed e conjunto candidato é estável se o snapshot não mudou.
- Pin de fontes por URL + commit/tag/snapshot + hash quando aplicável. O mesmo comando com o mesmo dataset, seed e config deve produzir a mesma grade; outputs do Gemini não são garantidamente determinísticos, então **salvar respostas brutas sanitizadas e versão do modelo/prompt** e congelar candidatos selecionados antes da publicação.
- A revisão humana edita somente texto das pistas e metadados, nunca altera coordenadas sem reexecutar validador.

## 5. Motor determinístico de grades

### 5.1 Responsabilidade

Entrada = coleção válida de `LexiconEntry` / `ClueEntry` elegíveis + seed + políticas de layout. Saída = `CrosswordPuzzle` candidato com matriz, palavras horizontais/verticais e referências de pistas; ou resultado tipado de falha (`insufficientEntries`, `timeBudgetExceeded`, `invalidLayout`, etc.). **Não inventar respostas para tapar buracos.**

### 5.2 Abordagem inicial

- Grade alvo `11x11` a `15x15` (pode ser menor em piloto de teste, nunca mascarar como qualidade final).
- Ordenar candidatos por riqueza de interseções e diversidade temática; inserir primeira palavra próximo ao centro; tentar cruzar letras via backtracking limitado e seed PRNG estável.
- Validar a cada colocação: limites, ausência de colisões, contato lateral não autorizado, cruzamento letra igual, nenhuma palavra sobre outra na mesma direção, ausência de palavras “fantasmas” em sequências incidentais.
- Preferir maior conectividade, quantidade de cruzamentos e equilíbrio horizontal/vertical; penalizar fileiras isoladas, múltiplas siglas e repetição temática. Nada de transformar pontuação em verdade editorial.
- Passar no `validatePuzzle` antes de criar pistas. Não publicar grade que o validador rejeita, mesmo que algoritmo tenha concluído sem erro.

### 5.3 Regras exatas do validador estrutural

- Todas as células declaradas dentro dos limites, ocupação consistente e letras `A–Z`.
- Cada entrada tem um ID/número/direção/início/comprimento; nenhuma entrada zero ou de uma letra; V1 normal > =3 letras (exceções editoriais exigem aprovação explícita e são auditáveis).
- Cada entrada é uma sequência contígua; célula declarada corresponde ao caractere na posição; sobreposições só se caracteres idênticos.
- Nunca duas entradas diferentes se sobrepõem na mesma direção, nem terminam em sequência formando palavra acidental não cadastrada; bloco/célula não forma “entradas-fantasma”.
- Grafo de entradas conectado via células compartilhadas (um componente); cada entrada tem preferencialmente ≥2 interseções; **gate inicial mínimo 2** em puzzles de produção; ≥65% das células de letras cruzadas, medido como `checkedCellRate`; equilíbrio H/V, sem orientação faltante.
- Precisamente um `clueId` aprovado para cada entrada, sem pista órfã, resposta coerente com `canonicalAnswer`; ausência de colisão de `clueNumber` no mesmo conjunto `(number,direction)`.
- Uma solução física única por célula, derivada do tabuleiro; validação não deve depender de manter “duas letras” na interseção.
- Sem erros semânticos ostensivos: não aceitar palavras por aproximação de grafia, truncamento ou duplicatas de resposta no mesmo puzzle.

**Nota:** limiares de conectividade/interseção são metas técnicas adotadas na V1; o piloto pode mostrar necessidade de refinamento, que exige ADR explícito antes de relaxar produção.

## 6. Runtime e states

```text
home
  -> daily.start / daily.resume -> playing -> validated-complete -> result
  -> free.start / free.resume   -> playing -> validated-complete -> result
playing -> paused -> playing
playing -> leave-confirm -> home | playing
playing -> date-rollover (se daily) -> expired -> home/today
catalog load error -> explain / retry / free (se disponível)
storage failure -> in-memory with nonfatal warning
```

A sessão guarda caracteres em mapa por célula (`cellKey`), direção selecionada, célula ativa, tempo ativo, uso de ajuda e revisões de storage. O tabuleiro e a solução são carregados por `puzzleId` e **nunca** copiados para o `localStorage` como fonte de verdade editorial.

## 7. Persistência e consistência multiabas

- `localStorage` API centralizada: `loadState(): PersistenceResult`, `saveState(next): SaveResult`, migrações versionadas e atualização atômica do JSON quando possível (write-one-key). Bloquear gravação de estrutura desconhecida; criar backup local temporário durante migração quando viável.
- `storage` event sinaliza mudança em outra aba. Merge: conclusões diárias = união de conjuntos de datas; melhor streak derivado; sessão editada = escolher revision maior ou exigir seleção explícita se conteúdos divergirem. Timestamp por si só não garante integridade do conteúdo.
- Se `localStorage` indisponível: modo efêmero com aviso, nunca loop infinito/reload; teste de Safari modo privado/limite.
- `catalogVersion`/`puzzleId` persistidos para retomada segura e detecção de atualização de catálogo; não fabricar resposta antiga usando grade nova.

## 8. Segurança e threat model mínimo

| Ameaça | Controle V1 | Limitação honesta |
|---|---|---|
| Chave Gemini exposta no JS | Gemini usado só em scripts locais/CI privado, scan `VITE_`, Git ignore | Compartilhar `.env` manualmente ainda pode vazar se erro humano |
| API pública abusada | Não existe endpoint Gemini público na V1 | Geração dinâmica no navegador não é oferecida |
| Licença incompatível | Registro por fonte/item, allowlist, bloqueio de publicação sem atribuição | Exige revisão humana de condições de uso |
| Prompt injection em dados externos | Tratar como dados, validação de schema, não executar saídas | LLM ainda pode errar fatos |
| Dados corrompidos/tainted | Zod parse, migrations, sanitização sem `dangerouslySetInnerHTML` | Histórico pode ser irrecuperável em corrupção grave |
| Spoilers via client | Não considerar anti-cheat; jogo local casual | Qualquer usuário pode inspecionar assets/DevTools |
| Relógio adulterado | Data canônica, idempotência e checagem no finalize | Streak local não é antifraude |
| Regressão de catálogo | manifest imutável por data, hash e tests | Dados de deploy anterior podem persistir em aba aberta |

## 9. Não-requisitos de arquitetura

- Não usar SDK Gemini dentro da SPA; não instalar auth, Supabase, banco, servidor apenas para incrementar streak.
- Não requerer métricas de uso ou cookies de tracking; sem consentimento, nada de coletar dados comportamentais.
- Não confundir acervo lexical bruto com pistas aprovadas ou puzzles finalizados.

## 10. Interfaces canônicas

Assinaturas e schemas estão definidos em `DATA_CONTRACTS.md`. **O Codex não deve renomear propriedades entre camadas sem atualizar contratos e testes de migração**, nem “resolver” ambiguidade criando dois formatos equivalentes.
