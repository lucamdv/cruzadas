# Entrelinhas · Alpha experimental

Demonstração pública de uma partida em português brasileiro, com identidade oficial B — Playful Premium. React + TypeScript + Vite, arquivos estáticos, sem API ou credenciais. Símbolo modular E, faixa cobalto, seleção lima e assinatura de marca derivam do estudo escolhido pelo proprietário.

```sh
npm ci
npm run dev
```

Use Node24.19 ou versão24posterior e npm11.9. Para verificar: `npm test -- --run`, `npm run lint`, `npm run typecheck`, `npm run build`. Build em `dist`.

Na Vercel, importe `lucamdv/cruzadas`, branch `main`, diretório raiz `./`, preset Vite. Build `npm run build`, instalação `npm ci`, saída `dist`. Nenhuma variável de ambiente é necessária. A conta proprietária precisa autorizar a integração GitHub/Vercel.

O Alpha permite selecionar pistas/casas, digitar, apagar, alternar direção, conferir palavras sob pedido, revelar letra com confirmação, concluir e reiniciar. O progresso fica somente em memória e é apagado ao recarregar.

DEMO/EXPERIMENTAL criada especialmente para exibição pública nesta entrega, sem aprovação editorial humana presumida e sem equivalência à rubrica de produção. Não contém corpus, soluções históricas ou artefatos privados. As respostas da demonstração estão no cliente.

Faltam para a V1: catálogo editorial aprovado, diário e data Recife, streak, persistência/migrações, seleção livre, estatísticas, calibração editorial e testes com aparelhos físicos. As especificações em `docs` descrevem essa versão futura.

A branch pública recebe apenas os arquivos selecionados do Alpha. Os históricos de pesquisa e backups permanecem no checkout privado preservado.
