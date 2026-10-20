# Revisão final do kit — Entrelinhas 1.0.0

**Data:** 2026-10-20 | **Tipo:** revisão documental e de arquitetura, **não** revisão de código de produto.

## O que mudou em relação ao kit inicial

1. **Fonte de verdade corrigida:** docs canônicos são coerentes com a arquitetura atual; retiradas as proibições antigas de usar Gemini e a promessa implícita de infinitas grades diferentes.
2. **Gemini incorporado corretamente:** geração editorial de pistas via API privada, interface desacoplada, JSON estruturado, controle de orçamento e obrigatoriedade de curadoria humana. Não enviar chave ao navegador e não presumir franquia API no AI Pro.
3. **Cultura pop/literatura tornadas obrigatórias:** Wikidata como fonte estrutural prioritária, tópicos reconhecíveis e evidência com QIDs; temas balanceados em catálogo.
4. **Licenças com bloqueio seguro:** repositórios de vocabulário são candidatos a inspeção de procedência; não importar ou redistribuir só porque o código é público.
5. **Motor de grade auditável:** invariantes, feedback tipado, seed reproduzível, rejeição de palavras-fantasma e métricas mínimas de cruzamento.
6. **Diário e streak testáveis:** `America/Recife`, meia-noite, idempotência, sem concluir retroativamente, sem pontos por modo livre e proteção contra troca silenciosa de puzzle.
7. **Persistência robusta:** `localStorage` com schema e fallback, conflito multiabas e retenção de conclusões.
8. **UX mobile exigente:** teclado virtual, foco, interseções, zoom, acessibilidade e visual Apple-inspired sem cópia.
9. **Execução estilo ELMO:** guias, passos, ownership, RED→GREEN, evidência real, revisão Architecture/Security/Final Quality, Consistency Gate e STOP humano.
10. **Critério de lançamento objetivo:** 10 pilotos + 30 diários consecutivos incluindo estreia + 60 livres aprovados, não fixtures.

## Riscos residuais honestos

- **Não há equivalência de dificuldade comprovada ao Globo.** Depende do piloto da Malu.
- **Acervos abertos não equivalem a direitos uniformes sobre seus dados.** Procedência e licença devem ser auditadas.
- **Sem backend/conta, o streak é local e não antifraude; limpar navegador pode apagar progresso.**
- **Partidas ilimitadas ≠ puzzles únicos infinitos.** Há catálogo e renovação editorial; repetições futuras podem ocorrer.
- **Chamada real à API pode ter custo/limites separados do Google AI Pro.** Não foi usada nenhuma chave nem cobrada API para produzir estes documentos.
- **Skill Apple pode não existir no Codex conectado.** O prompt manda descobrir e registrar, com HIG oficial como fallback.
- **Não houve código, testes automatizados do produto ou deploy.** Nenhum documento deve ser interpretado como prova de aceitação de software inexistente.

## Pronto para próxima decisão

O primeiro prompt autoriza somente **inspeção e proposta de GUIA 01**. Iniciar edição, enviar push e publicar exigem autorizações separadas conforme `AGENTS.md`.
