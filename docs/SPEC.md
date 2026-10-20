# SPEC — Entrelinhas V1

**Document ID:** ENT-SPEC-001 | **Versão:** 1.0.0 | **Data:** 20/10/2026 | **Status:** aprovado conceitualmente pelo solicitante; implementação e validação editorial ainda pendentes | **Idioma:** `pt-BR`

## 0. Resumo executivo

Site de palavras cruzadas original para Malu, habituada às cruzadas do Globo. Uma experiência desafiadora porém justa, refinada em celular e desktop, com **desafio diário** e **nova cruzada** quantas vezes quiser. Streak acompanha exclusivamente desafios diários concluídos dentro do respectivo dia civil (`America/Recife`). O jogo não exige conta; progresso no `localStorage`. Dados vêm de fontes públicas rastreáveis; motor determinístico monta/valida grades; **Gemini API gera pistas candidatas em pipeline editorial privado**; somente puzzles validados e aprovados são publicados. Deploy estático na Vercel. A chave Gemini nunca vai ao cliente.

## 1. Visão de experiência

- **O que Malu vê:** entrar → desafio de hoje ou nova cruzada → tocar na grade/pista → escrever e cruzar respostas → conferir sob demanda → concluir → ver resultado e streak → continuar jogando.
- **O que Malu não vê:** login, necessidade de créditos, pop-ups insistentes, dicas infantis, custo de IA, teclas coloridas indicando erro a cada input, espera por geração remota para iniciar uma partida do catálogo.
- **Personalidade:** acolhedora, adulta, divertida sem infantilização; mensagens curtas e naturais, sem parodiar nem clonar identidade de Globo, Apple ou Termo.
- **Estilo:** desafio clássico = mistura de vocabulário, expressões, literatura, cultura pop, música, arte, história, ciência e geografia, especialmente referências culturalmente compreensíveis a brasileiros.

### 1.1 Critérios de êxito (verificáveis)

1. Início deixa visíveis as duas ações primárias **Desafio de hoje** e **Nova cruzada**, sem tutorial obrigatório.
2. Cruzada utilizável com teclado físico, touch e teclado virtual; entradas cruzadas não divergem.
3. Diário estável para todas as instalações que consultam o mesmo catálogo publicado na mesma data; conclui uma vez; fechamento não dá múltiplas recompensas.
4. Livre sem limite de sessões diárias nem gasto de recursos; tenta evitar repetição recente e sempre permite recomeçar, inclusive se o catálogo se esgotar.
5. Autosave e retomada; falhas de storage têm fallback em memória e mensagem discreta.
6. Feedback ortográfico somente quando o jogador pede conferir/revelar/finalizar; não há destaque automático de letra certa/errada.
7. Nenhum puzzle publicado viola contratos de tabuleiro ou o gate editorial.
8. Releases passam testes automatizados + inspeção visual/responsividade + rodada humana de calibração; ver `QUALITY_GATES.md`.

## 2. Escopo e prioridades

### 2.1 P0 — obrigatório na V1

**Produto:** home, desafio diário, livre, tela de jogo, resultado, estatísticas/streak, ajuda contextual curta e autosave. **Domínio:** normalização em pt-BR; geração/seleção determinística; validação da grade; teclado/navegação; calendário diário; cronômetro de tempo ativo; conclusão. **Editorial:** acervo público com controle de origem, geração de pistas por Gemini em ambiente privado, catálogo estático, revisão humana, integridade do manifest. **Operação:** testes, scripts reprodutíveis, documentação e release Vercel controlado.

### 2.2 P1 — pós-lançamento (não bloquear V1)

- Exportação e importação de backup local (com checksum/esquema e avisos).
- Modo escuro automático/opcional, PWA/offline aprimorado, compartilhamento sem spoilers, conquistas cosméticas, coleção de jogos concluídos, preferências avançadas, métricas de qualidade editoriais agregadas sem PII.
- Nova produção de catálogos e automação editorial controlada; **não** é justificativa para criar endpoint público Gemini na V1.

### 2.3 Fora da V1

Conta, sincronização multi-dispositivo, banco remoto, Supabase, ranking online, multiplayer, monetização, anúncios, paywall, sistema CMS, adversários, dificuldade adaptativa, três dificuldades, inteligência artificial respondendo no meio da partida, coleta remota de comportamento e proteção competitiva contra relógio/DevTools adulterados.

## 3. Modelo de jogo

### 3.1 Desafio diário

- Há **1 puzzle publicado por data civil** representada em `YYYY-MM-DD` no fuso fixo `America/Recife`.
- O ID diário e o mapeamento data→puzzle são estáveis e derivados de manifesto editorial versionado. Não alterar retroativamente a entrada de uma data já disponibilizada; novas versões devem preservar mapeamentos existentes.
- Estados: `not_started`, `in_progress`, `completed`, `expired_unfinished` (visualizado após virar o dia). Diário do dia anterior não pode ser concluído retroativamente para streak; salvar rascunho apenas para fins de histórico.
- Ao iniciar/retomar, usar puzzle ID salvo; se o catálogo muda, nunca substituir silenciosamente uma grade em andamento. Resolver incompatibilidade com aviso e preservação dos dados originais, quando possível.
- Conclusão registra `completedOn` com data civil atual; se a data já virou, impedir crédito retroativo e oferecer puzzle do novo dia.
- Quando falta conteúdo para a data, mostrar estado honesto e opção de jogo livre. **Nunca reciclar silenciosamente o mesmo puzzle como diário válido nem atualizar o streak sem conclusão.** Gate de release impede publicar sem horizonte editorial mínimo.

### 3.2 Streak — regra determinística

- `currentStreak` armazenado pode ser rederivado do conjunto ordenado e único de datas diárias concluídas; fonte de verdade é `completedDailyDates`.
- Ao concluir `today`: se já consta em datas, não incrementar; se há conclusão `yesterday`, streak = anterior + 1; senão streak = 1.
- Ao exibir, se `lastCompletedDate` é `today` ou `yesterday`, a sequência mantém-se ativa; se mais antiga, `currentStreakDisplay = 0`. `bestStreak` histórico não diminui.
- Partida livre jamais modifica datas diárias. Conclusões assistidas **contam** para streak e ficam marcadas `assisted`.
- Comparação de dias: usar `YYYY-MM-DD` de `Intl.DateTimeFormat` com `timeZone: 'America/Recife'`; calcular dia consecutivo a partir de ordinal de data civil (não subtrair 86.400.000 ms de relógio local nem depender do fuso do aparelho). Relógio adulterado é uma limitação explícita sem backend.

### 3.3 Modo livre

- Botão **Nova cruzada** acessível na home, ao concluir e durante uma partida (com confirmação para abandonar se houver progresso).
- Não existe cota, moedas nem limite diário. Usar variedade de puzzles aprovados, seleção com histórico de IDs e janela de não repetição configurável (padrão **últimos 10 IDs**, quando houver acervo suficiente).
- Se todos os puzzles livres foram vistos, permitir revisitá-los com mensagem honesta e ordenação diferente. **Catálogo finito não garante tabuleiros eternamente inéditos**; plano editorial expande acervo periodicamente.
- Não construir e publicar puzzle ainda não aprovado em tempo real. Geração procedural pode ser feita no pipeline editorial para aumentar variedade.
- Partida livre iniciada salva `sessionId` UUID, `puzzleId`, estado independente; retomar último livre em andamento. Por padrão apenas um livre ativo; ao pedir novo com progresso, oferecer `Continuar`/`Trocar`.

### 3.4 Digitação e navegação

- Casas bloqueadas; células abertas contêm **uma** letra A–Z (sem diacríticos; `Ç → C`); respostas compostas têm espaços/hífens removidos apenas para a grade, preservando forma original e enumeração na pista.
- Clicar/tocar célula ativa seleciona palavra; se célula participa de duas, tocar de novo alterna direção. Também alternar com tecla definida/documentada (ex.: Espaço quando não estiver digitando texto) e botões/labels visíveis; nunca depender só de gesto oculto.
- Teclado físico: caracteres A–Z, setas (mover célula), Backspace (apaga e navega), Tab (próxima pista), Shift+Tab (anterior); evitar capturar atalhos quando foco está em botão, input externo ou menu.
- Teclado touch: um campo de entrada acessível e foco controlado, sem abrir/fechar teclado a cada letra; seleção de pistas que reposiciona foco sem scroll inesperado; não duplicar digitação (composition/input); Android/iOS testados.
- Cruzamento compartilha uma célula única: qualquer letra aparece nas duas direções; não pode existir estado separado por palavra.
- `Conferir palavra` a pedido informa se há erros **sem revelar automaticamente a solução**; `Revelar letra` requer confirmação e marca `assisted`; `Finalizar` só completa se a grade inteira estiver correta. Ao final, respeitar ações de conferência/ajuda e duração.
- Não há verificação corretiva a cada tecla, cor vermelho/verde permanente ou “vidas”.

### 3.5 Tempo e resultado

- Cronômetro de tempo ativo, não do tempo absoluto desde abertura; pausar em `visibilitychange` quando página oculta, e quando modal de pausa explícito estiver aberto. A implementação deve resgatar valores salvos sem dupla contagem após reload.
- Resultado mostra duração, quantidade de palavras, ajudas, conferências, status `assistida` (quando aplicável); streak só no diário. Animação sutil e opção de reduzir movimento.

## 4. Conteúdo e dificuldade

### 4.1 Curadoria

- Conteúdo original e adulto, ortografia brasileira contemporânea, cultura geral reconhecível. Referências pop: cinema, séries, TV, novelas, quadrinhos, games, personagens e literatura (clássica e atual); contextualizar referência pouco óbvia.
- Mistura inicial sugerida no catálogo: **30% vocabulário/expressões; 25% história/geografia/ciências; 15% literatura/artes; 15% cultura pop; 10% música; 5% outros**. É meta editorial de banco, não uma quota obrigatória por puzzle (tabuleiros curtos variam naturalmente).
- Complexidade editorial aproximada: **20% acessível, 55% intermediária, 25% exigente**, medida no acervo e calibrada empiricamente com Malu; são METAS, não critérios para inventar dificuldade.
- Evitar pistas que entregam resposta, que dependam de fatos especulativos/que mudam rápido, xenofobia/estereótipos, referências degradantes, títulos repetidos em excesso, siglas indecifráveis, flexões forçadas, palavras de 2 letras como enchimento sistemático e nomes raros sem contexto.
- Não copiar pistas, palavras cruzadas, soluções ou edição proprietária do Globo; não referir “oficial” ou “parceria”.

### 4.2 Pistas Gemini

- Gemini recebe somente candidatos de resposta já estabelecidos (evidência contextual, tema, enumeração, nível pretendido, proibições) e sugere 2–3 pistas em **JSON estruturado**; não escolhe palavras arbitrárias, não posiciona peças, não modifica resposta e não é juiz único da própria veracidade.
- `draft → auto_checked → editorial_approved → published`; rejeitar JSON inválido, vazamento da resposta, ambiguidade injusta, resposta diferente, erros factuais ou falta de fonte para afirmação verificável. Pistas factuais exigem verificações em referência rastreável e/ou revisão humana; a “confiança do Gemini” nunca é prova.
- Metadados de `model`, `promptVersion`, origem e revisão acompanham itens de conteúdo; **não** publicar prompts internos, API key ou dados pessoais. Para conteúdo não referencial, definicões linguísticas de acervos podem servir como fonte de checagem.
- Na V1, Gemini roda apenas em `scripts/editorial/*` em máquina privada ou job manual com secrets; o site **não** oferece chamada pública a Gemini. Publicar lotes aprovados. A assinatura Google AI Pro não é cota automática da Gemini API.

### 4.3 Política de acervo e abastecimento

- Fontes candidatas (não autoautorizadas): `fserb/pt-br`, `OpenWordNet-PT`, Wikidata (forte para literatura/cultura pop), `Kaikki/Wikcionário` (termos/expressões; licenciamento especial), `pythonprobr/palavras` (apoio ortográfico). Importar somente mediante conferência de licença + procedência por fonte, documentada no `CONTENT_PIPELINE.md`.
- Preferir **Wikidata CC0** para fatos/cultura pop/literatura; licenças de acervos linguísticos podem exigir atribuição/compartilhamento. Registro de linhagem item a item.
- Alvo inicial de lançamento: **30 desafios diários distintos e aprovados**, mais **60 puzzles livres aprovados**, com **10 puzzles-piloto** para testar dificuldade antes da escala. Publicações posteriores estendem horizonte com antecedência; gate de produção exige **30 datas civis consecutivas contando o dia do lançamento como a primeira**.
- Sem conteúdo revisado suficiente não declarar lançamento completo; fixtures artificiais não valem como catálogo final.

## 5. UX / identidade e acessibilidade

### 5.1 Direção de design

- Nome de trabalho: **Entrelinhas**; marca original com referência visual a letras, grade, papel/livro; sem identidade copiada do Globo ou Termo. Personalidade delicada, mas não infantil.
- HIG Apple como princípios de clareza, hierarquia, contexto consistente, feedback, acessibilidade, interação previsível. Skill Apple **somente se existir instalada no Codex**; registrar qual foi lida; ausência não bloqueia design.
- Visual light-first com tons papel/creme, tipografia de alto contraste e um acento suave. Gradientes e animações só se auxiliarem compreensão, respeitando `prefers-reduced-motion`.
- Não esconder controles vitais atrás de hover; feedback não depende exclusivamente de cor. Evitar emojis como única pista de status.

### 5.2 Páginas e estados

1. **Home:** branding, card de desafio diário com data/status/progresso/CTA, streak, CTA `Nova cruzada`, estatísticas, aviso de armazenamento local acessível em ajuda.
2. **Game:** cabeçalho leve, grade central, pista ativa imediatamente legível, horizontais/verticais em listas ou abas, indicador de tempo, status, ações `Conferir palavra`, `Revelar letra`, `Pausar`, `Voltar`; feedback não intrusivo.
3. **Resultado:** alegria sem excesso, tempo, assistência, streak (só diário), nova livre/voltar.
4. **Estatísticas:** streak atual e recorde, número de diários, número de livres, calendário textual e visual, status de dispositivo.
5. **Estados críticos:** primeira visita, retomada, mudança de data à meia-noite, sem diário publicado, catálogo de livre esgotado, storage desabilitado, falha de importação, dados incompatíveis, ausência de internet para carregar novos assets, modal de abandono, informação de acessibilidade.

### 5.3 Critérios de interação

- Layout testado em larguras **320, 375, 390, 768 e 1440 px**; evitar overflow horizontal da página e sobreposição de teclado/pista; a grade pode ter pan/zoom próprio acessível sem minúsculas células interativas.
- Alvos preferencialmente **44×44 CSS px** para controles importantes touch, respeitando possível densidade/zoom; grade com estratégia de zoom e seleção por lista de pistas quando célula pequena. Zoom 200% sem perda de funcionalidades.
- Sem perda de foco em cada entrada; navegação completa por teclado; foco visível; labels de células acessíveis com coordenada, número e direção, exemplos `linha 3, coluna 5, horizontal 7`.
- Contraste almejado WCAG AA para texto e estados relevantes; verificar ferramenta e revisão manual. `aria-live` apenas para eventos importantes (pista selecionada, conclusão, erro), sem falar cada tecla duas vezes.

## 6. Tecnologia, dados e arquitetura

- React + TypeScript + Vite; roteamento leve conforme necessidade; CSS modular/tokens (não escolher biblioteca pesada só por conveniência); testes Vitest + React Testing Library e Playwright; schema Zod ou equivalente; Node scripts editoriais; publicação Vercel conectada ao GitHub após aprovação.
- Frontend estático servido pela Vercel; **nenhuma chamada Gemini no navegador**; estado no `localStorage` (versão do schema, verificações de integridade, parse defensivo), sem login e sem conta.
- Acessibilidade e domínio desacoplados; ver estrutura concreta em `ARCHITECTURE.md` e contratos em `DATA_CONTRACTS.md`.
- Soluções vêm com puzzles em assets estáticos; não reivindicar proteção contra inspeção pelo usuário. Estilo casual, confiança local. Não coletar telemetria de pessoa sem consentimento.

## 7. Regras negativas e situações-limite

- Interseções inconsistentes, palavras deslocadas, letras sem pista ou entradas desconectadas → **rejeitar grade** no pipeline.
- Expressões com espaço, hífen ou acento → canonizar para A–Z, preservar grafia e enumeração no metadado; nunca cortar letra para encaixar.
- Mesmo puzzle diário em versões diferentes → manifest imutável; atualização segura; `puzzleId` pinado à sessão iniciada.
- Reload ou múltiplas abas → salvar idempotente; reconciliar usando revisão e timestamp sem apagar conclusão; quando conflito irrecuperável, avisar e não inventar prêmio.
- `localStorage` vazio/corrompido/QuotaExceeded/security error → fallback temporário, alertar usuário, preservar o que for possível; não travar interface.
- Usuário atravessa meia-noite com diário aberto → recalcular data ao foco/finalizar; se expirou, não permitir somar streak do dia anterior.
- Sem internet → partidas já carregadas podem continuar; assets ainda não disponíveis exibem explicação e convite para reconectar.
- Questão factual errada/desatualizada ou duplicata tematicamente injusta → reprovar conteúdo; jamais enviar para produção baseado só em um score de LLM.

## 8. Release e Definition of Done (V1)

Só chamar de V1 pronta quando:

- [ ] 30 diários + 60 livres **distintos, com `editorial_approved` comprovado** e manifest versionado; 30 datas consecutivas a partir da estreia (inclusive) cobertas.
- [ ] Checklist estrutural 100% para todos os puzzles publicados, schema validado, qualidade editorial e licença checadas.
- [ ] Tests de domínio (células, normalização, datas, streak, persistência, repetição), integração de UI, E2E desktop e mobile e regressão completa com evidência.
- [ ] `lint`, `typecheck`, `test`, `build`, `catalog:validate` passam em execução recente no commit candidato a release.
- [ ] 10 partidas piloto: Malu avalia dificuldade e ergonomia; registrar resultados reais e ajustes. **Não alegar equivalência ao Globo sem esses dados.**
- [ ] Segurança: `.env*` ignorado, scan de segredos, ausência de `GEMINI_API_KEY` no bundle/client, nenhum endpoint público Gemini, licenças/atribuição disponíveis.
- [ ] Revisões Architecture / Security-Leakage / Final Quality sem `Critical` ou `Important` abertos; `Consistency Gate` passado.
- [ ] Vercel preview verificada (mobile+desktop, tráfego real, carregamento de catálogo), produção publicada só após autorização expressa do dono.

## 9. Dependências e leitura

- `docs/ARCHITECTURE.md` — módulos, fluxos e threat model.
- `docs/DATA_CONTRACTS.md` — tipos, JSON, funções canônicas e formato do storage.
- `docs/CONTENT_PIPELINE.md` — ingestão, fontes, atribuição, Gemini, pistas e revisão.
- `docs/QUALITY_GATES.md` — matriz de testes, reviews, gate por guia.
- `docs/DECISIONS.md` — ADRs e compromissos.
- `docs/superpowers/plans/2026-10-20-entrelinhas-v1.md` — execução por guias.

**Fontes oficiais de consulta técnica (verificadas em 20/10/2026):** https://ai.google.dev/gemini-api/docs/structured-output ; https://ai.google.dev/gemini-api/docs/google-ai-plans ; https://ai.google.dev/gemini-api/docs/pricing ; https://developer.apple.com/design/human-interface-guidelines/ ; https://vercel.com/docs/deployments .
