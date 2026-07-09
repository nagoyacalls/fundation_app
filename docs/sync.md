# Sync do Outlook

Leia ao mexer em `lib/graph.ts` ou `app/api/sync/`.

## Escopos

`openid profile email offline_access Mail.Read`

Nada além disso. Não peça escopo de escrita.

## Delta query

`/me/mailFolders/inbox/messages/delta`. Persista o `deltaLink` por usuário. A primeira chamada traz o backlog recente; as seguintes trazem só mudanças.

Upsert por `graphId`. O sync precisa ser idempotente: rodar duas vezes não pode duplicar demanda.

## Execução

Só via `/api/sync`, em cron, protegido pelo header `CRON_SECRET`. Nunca durante render de página.

## Erros

- `401` → refresh do token.
- `429` → respeitar `Retry-After`.
- Falha repetida → marcar conta para novo login e exibir banner. Não falhe em silêncio; uma conta dessincronizada perde demandas.

## Pipeline de ingestão

E-mail novo → `routing` resolve a empresa → `classification` sugere a categoria → cria `Demand` com `classificationConfirmed = false`.

Nenhum e-mail é descartado. Sem empresa resolvida, a demanda existe mesmo assim, em Não classificado.

## Testes

Mockar as respostas do Graph. Nunca chamar a API real em teste. Cobrir: primeira sync, sync incremental, `deltaLink` expirado, e-mail duplicado.
