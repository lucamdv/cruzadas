# Entrelinhas · Alpha experimental

Demonstração pública de uma partida em português brasileiro, com identidade oficial B — Playful Premium. React + TypeScript + Vite, arquivos estáticos, sem API ou credenciais. Símbolo modular E, faixa cobalto, seleção lima e assinatura de marca derivam do estudo escolhido pelo proprietário.

```sh
npm ci
npm run dev
```

Use Node24.19 ou versão24posterior e npm11.9. Para verificar: `npm test -- --run`, `npm run lint`, `npm run typecheck`, `npm run build`. Build em `dist`.

Na Vercel, importe `lucamdv/cruzadas`, branch `main`, diretório raiz `./`, preset Vite. Build `npm run build`, instalação `npm ci`, saída `dist`. Nenhuma variável de ambiente é necessária. A conta proprietária precisa autorizar a integração GitHub/Vercel.

O Alpha permite selecionar pistas/casas, digitar, apagar, alternar direção, conferir palavras sob pedido, revelar letra com confirmação, concluir e reiniciar. Letras, seleção, direção, tempo ativo, conferências, ajudas e conclusão são salvos automaticamente neste navegador, na chave versionada `entrelinhas:state:v1`, usando `PersistedStateV1`. Recarregar retoma a mesma partida. Reiniciar pede confirmação quando há progresso e preserva os registros anteriores.

O salvamento requer armazenamento disponível e Web Locks. Dados corrompidos, versões desconhecidas, quota e conflitos divergentes entre abas entram em memória com aviso, sem sobrescrever o registro existente. A ação “Usar partida salva” permite escolher explicitamente a versão persistida. Relógios de abas não são somados. Não há sincronização entre dispositivos ou origens: progresso no preview não migra automaticamente para produção.

Aguarde a indicação “Progresso salvo neste navegador”. Enquanto uma gravação aguarda o lock, a interface informa “Salvando” e solicita proteção nativa ao fechar. Escolher sair apesar do aviso, encerramento abrupto do navegador ou sistemas que não entregam `beforeunload` podem interromper alterações ainda pendentes. No fallback em memória, fechar ou recarregar perde as alterações locais.

DEMO/EXPERIMENTAL criada especialmente para exibição pública nesta entrega, sem aprovação editorial humana presumida e sem equivalência à rubrica de produção. Não contém corpus, soluções históricas ou artefatos privados. As respostas da demonstração estão no cliente.

Faltam para a V1: catálogo editorial aprovado, diário e data Recife, streak, seleção livre, estatísticas, calibração editorial e testes com aparelhos físicos. A migração atual valida V1 de forma idempotente e rejeita formatos desconhecidos; não inventa formatos legados. As especificações em `docs` descrevem essa versão futura.

A branch pública recebe apenas os arquivos selecionados do Alpha. Os históricos de pesquisa e backups permanecem no checkout privado preservado.
