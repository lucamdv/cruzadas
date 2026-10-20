# Entrelinhas — kit canônico para Codex (V1)

**Versão documental:** 1.0.0 | **Data:** 2026-10-20 | **Estado:** design e plano prontos para revisão humana; **nenhum código de produto foi implementado**.

## Para que existe

Este kit orienta o Codex na construção de **Entrelinhas**, um site de palavras cruzadas em português brasileiro dedicado à Malu, fã da dificuldade e da jogabilidade das palavras cruzadas do Globo. O produto terá um desafio diário com sequência de dias (*streak*) e partidas livres ilimitadas, com interface refinada e acessível. A experiência é original: referências a outras marcas são somente de características genéricas do gênero, **não** de conteúdo ou identidade visual copiável.

**Decisão arquitetural principal:** dados lexicais públicos e fontes culturais rastreáveis → seleção e montagem determinística da grade → Gemini em **pipeline editorial privado** para criar candidatas a pistas → verificações técnicas e revisão humana → catálogo estático assinado por versão → site React/Vite com estado local. **A chave do Gemini nunca vai ao navegador.**

## Fonte de verdade (ordem)

1. `docs/SPEC.md` — o **que** construir, regras do produto e critérios de sucesso.
2. `docs/ARCHITECTURE.md` — **como** responsabilidades se comunicam; segurança e estados.
3. `docs/DATA_CONTRACTS.md` — schemas e interfaces; nomes canônicos.
4. `docs/CONTENT_PIPELINE.md` — fontes, licenças, criação de pistas e critérios editoriais.
5. `docs/QUALITY_GATES.md` — verificações, testes, revisões e evidência.
6. `docs/DECISIONS.md` — decisões explícitas, trade-offs e itens futuros.
7. `docs/TRACEABILITY.md` — matriz de requisitos → owners → testes.
8. `docs/REVISAO_FINAL.md` — alterações em relação ao primeiro kit, riscos e limites.
9. `docs/superpowers/plans/2026-10-20-entrelinhas-v1.md` — plano de implementação por guias.
10. `AGENTS.md` — instruções de execução para agentes; caso de conflito, **STOP** e reporte.
11. `prompts/00_INICIAR_CODEX.md` — mensagem inicial para colar no Codex.

## Como iniciar, sem pular etapas

1. Crie no GitHub um repositório vazio chamado `cruzadas-malu` (ou outro nome de sua escolha). **Não** crie produto, credenciais ou deploy no GitHub antes de revisar o plano.
2. Extraia o ZIP do kit **na raiz** do repositório, preservando `docs/`, `prompts/` e `AGENTS.md`. Não coloque uma segunda pasta intermediária `ENTRELINHAS_CODEX_V1` no repositório.
3. Confira se aparecem `AGENTS.md`, `README_COMECE_AQUI.md` e `docs/SPEC.md` na raiz correta.
4. Faça commit apenas da documentação. Abra o repositório no Codex.
5. Cole **todo** `prompts/00_INICIAR_CODEX.md` na primeira sessão.
6. O Codex deve **somente inspecionar**, verificar se há skill Apple no ambiente, fazer uma análise de consistência e propor a execução da **GUIA 01**. Não iniciar produto antes da aprovação.
7. Depois de aprovar o plano, execute **uma guia por vez**, com TDD RED→GREEN, revisão, testes, relatório STOP e revisão humana antes de seguir à próxima.
8. Configure `GEMINI_API_KEY` apenas quando chegar a GUIA de conteúdo; nunca cole a chave no chat, em screenshot, no GitHub nem em `VITE_*`.
9. Só ligue o GitHub à Vercel e publique após a GUIA de release e sua autorização explícita.

## Passo a passo rápido (Windows / PowerShell)

Se tiver Git instalado e o ZIP extraído numa pasta:

```powershell
cd CAMINHO\PARA\cruzadas-malu
git init
git add AGENTS.md README_COMECE_AQUI.md .env.example .gitignore docs prompts
git commit -m "docs: define entrelinhas v1 architecture and execution gates"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/cruzadas-malu.git
git push -u origin main
```

Se criar o repositório com README no GitHub, **clone primeiro** e copie os arquivos do kit para evitar histórico divergente. Substitua `SEU-USUARIO`; não execute comandos de push no repositório errado.

## Entregáveis e o que este pacote não é

- **Inclui:** especificação, arquitetura, contratos, política editorial e de fontes, quality gates, registro de decisões, plano faseado, instruções para Codex, `.env.example` sem segredos.
- **Não inclui:** aplicação pronta, credencial Gemini, importações reais de acervo, dicionários embutidos, pistas efetivamente revisadas, autorização para deploy nem garantia de equivalência de dificuldade ao Globo.

## Como solicitar a próxima etapa

Após o Codex apresentar a inspeção da GUIA 01, confira com `docs/QUALITY_GATES.md`; aprove explicitamente aquela guia. Não peça ao Codex para executar todas as guias de uma vez.
