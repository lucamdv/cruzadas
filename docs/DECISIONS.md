# DECISIONS — ADRs e pendências controladas

**Estado:** decisões fechadas para V1 em 20/10/2026. “Aberto” não autoriza o Codex a inventar outra arquitetura.

| ADR | Decisão | Razão | Consequência |
|---|---|---|---|
| 001 | React + TS + Vite; Vercel estática | Complexidade proporcional ao produto | Sem app nativo e sem backend obrigatório |
| 002 | `localStorage` versionado | Sem login, privacidade e custo baixo | Estado específico do navegador/dispositivo; dados podem se perder |
| 003 | Diário atrelado a `America/Recife` | Regra determinística combinada | Usuário em outro fuso ainda segue horário de Recife |
| 004 | Apenas diário concluído no dia alimenta streak | Recompensar constância diária | Livre não soma; diário expirado não retroage |
| 005 | Banco de fontes públicas + Wikidata cultural | Variedade, literatura e pop | Licença/proveniência por fonte e por item |
| 006 | Gemini cria **pistas candidatas** no pipeline privado | Qualidade e controle editorial | API não roda por clique do jogador; requer geração prévia de catálogo |
| 007 | Motor próprio gera/valida grids | Geometria reproduzível e testes | Mais engenharia inicial, menos falhas silenciosas |
| 008 | Catálogo estático publicado com aprovação humana | Jogo fluido, chave segura e conteúdo confiável | Variabilidade é finita; catálogo deve ser ampliado |
| 009 | Modo livre ilimitado em sessões, não singularidade infinita | Honestidade com acervo finito | Repetição eventual após esgotamento, sinalizada |
| 010 | Referência Globo apenas em dificuldade e gênero | Originalidade e IP | Nenhuma pista/grade/logo copiado |
| 011 | Referência Apple HIG; skill Apple condicional | Respeitar ambiente real do Codex | Se ausente, HIG oficial e reportar |
| 012 | Conclusões com ajuda contam, marcadas `assisted` | Jogo casual sem punição | Estatísticas preservam informação |
| 013 | Conteúdo não aprovado não entra em release | Principal risco é editorial | Pipeline bloqueia quando não há revisão humana |
| 014 | Regras de domínio independentes da IA | Testabilidade e troca de provedor | Adapter `ClueProvider` substituível |
| 015 | Sem endpoint Gemini público na V1 | Proteger credenciais, evitar abuso | P1 possível com ADR própria, auth e rate limiting |

## Assuntos que exigem calibração, não decisão nova de arquitetura

- Feedback da Malu em 10 puzzles-piloto: tempo de solução, justiça de pistas e ergonomia. É a medição necessária para afirmar dificuldade bem calibrada.
- Marca visual final e conjunto preciso de cores/fontes: Codex apresenta opções originais, orientadas por HIG, sem bloquear motor.
- Cobertura de fontes importáveis: algumas têm licença complexa; se uma fonte for barrada, prosseguir com outras aprovadas, registrando o impacto no acervo.
- Volume do catálogo pós-lançamento e cadência de expansão: pelo menos 30 dias de diário cobertos na estreia; futuras publicações exigem continuidade operacional.

## Mudança formal de decisão

Se surgir pressão por (a) geração Gemini on demand, (b) login/sync, (c) reputação/ranking ou (d) mudança de timezone, parar, escrever ADR nova com alternativa, impacto em ameaça/custo/QA, e aguardar aprovação antes de editar produto.
