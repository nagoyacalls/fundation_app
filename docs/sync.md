# Sync do Outlook

Leia ao mexer em `lib/graph.ts` ou `app/api/sync/`.

## Escopos

`openid profile email offline_access Mail.Read`

Nada além disso. Nunca escopo de escrita.

## Delta query

`/me/mailFolders/inbox/messages/delta`. Persista o `deltaLink` por usuário. A primeira chamada traz o backlog recente; as seguintes trazem só mudanças.

Upsert por `graphId`. O sync precisa ser idempotente: rodar duas vezes não pode duplicar demanda.

## Execução

Só via `/api/sync`, em cron, protegido pelo header `CRON_SECRET`. Nunca durante render de página.

Seleção de usuários: filtre por `syncStatus in (pendente, ativo)`. **Nunca** por `refreshToken != null` — ver `docs/dominio.md`.

## Erros

- `429` → respeitar `Retry-After`.
- `401` / `invalid_grant` → `syncStatus = reauth_required`. **Mantenha o `refreshToken`**; apagá-lo impede a conta de voltar.
- Erro transitório (5xx) → registre em `lastSyncError`, mantenha `syncStatus = ativo`, tenta de novo no próximo cron.

Registre sempre `lastSyncAt`. Não falhe em silêncio: uma conta dessincronizada perde demandas.

## Reautenticação

Ao entrar em `reauth_required`, a interface **precisa** exibir um banner ao usuário afetado, com botão de reconectar. Sem isso a conta fica parada e ninguém sabe.

No novo login: se o Entra devolver refresh token, grave-o e ponha `syncStatus = ativo`. O Entra frequentemente **não** devolve token quando a sessão SSO ainda está válida — então, quando o status for `reauth_required`, force `prompt: "consent"` na autorização para garantir que venha um.

## Pipeline de ingestão

E-mail novo → `routing` resolve a empresa → `classification` sugere a categoria → cria `Demand` com `classificationConfirmed = false` e `dueDate` nulo.

Nenhum e-mail é descartado. Sem empresa resolvida, a demanda existe mesmo assim, em Não classificado.

## Testes

Mockar as respostas do Graph. Nunca chamar a API real em teste.

Cobrir: primeira sync, sync incremental, `deltaLink` expirado, e-mail duplicado, `invalid_grant` marcando `reauth_required` sem apagar o token, e o ciclo completo expirar → relogar → voltar a sincronizar.
