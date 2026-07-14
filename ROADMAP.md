# ROADMAP

Estado em 10/07/2026. Uma etapa por vez; cada etapa deixa o sistema funcionando.

---

## Concluído

- [x] **1. Fundação** — schema, migration, `routing.ts`, `classification.ts`, `validations.ts`, testes.
- [x] **2. Autenticação** — Auth.js v5 + Entra ID, sessão JWT, refresh token cifrado.
- [x] **3. Sync** — `graph.ts` (delta, 410, 429, 401), `/api/sync` com `CRON_SECRET`, testes com Graph mockado.
- [x] **4. Ingestão** — `sync.ts`, idempotente, demanda nasce com `classificationConfirmed = false`.
- [x] **5. Fila de revisão** — `/revisao`, confirmação de empresa e categoria, gravação automática de `CompanyDomain`.

---

## Etapa 5.1 — Correções (concluída)

Diagnóstico completo em `REVISAO.md`.

- [x] **`syncStatus` separado do `refreshToken`.** *(crítico)*
  `User` ganhou `syncStatus` (`pendente | ativo | reauth_required`), `lastSyncAt`, `lastSyncError`, com migration que faz backfill.
  `/api/sync` filtra por `syncStatus`, nunca por token nulo. Em `GraphAuthError`, marca `reauth_required` e **mantém** o token.
  `signIn` grava `ativo` ao receber token novo. Transições em `lib/sync-status.ts`, puras e testadas.
  Ciclo expirar → relogar → voltar a sincronizar coberto em `lib/sync-status.test.ts`.

- [x] **Banner de reconexão.** Layout autenticado (`app/(app)/`) com faixa quando o usuário está em `reauth_required`; botão força `prompt: "consent"`.

- [x] **`middleware.ts`.** Config edge-safe em `auth.config.ts`. Protege tudo por padrão; libera `/login`, `/api/auth` e assets. `/api/sync` segue no `CRON_SECRET`. Verificações removidas das páginas.

- [x] **`lib/demand.ts`.** Único caminho autorizado a mudar `status` e gravar `closedAt`, validado por `demandSchema`. `nextDemandState` puro e testado nas 16 transições.

---

## Etapa 5.2 — Prazos (concluída)

Depende de: 5.1. Especificação em `docs/prazos.md`.

- [x] `Demand.dueDate` (`DateTime?`) no schema + migration.
- [x] `lib/deadline.ts` — função pura `deadlineState(dueDate, status, now)` → `sem_prazo | no_prazo | vencendo | atrasada`. Status terminal nunca é `vencendo` nem `atrasada`.
- [x] Testes: cada estado, fronteira do "vence amanhã", status terminal com prazo vencido, prazo nulo.
- [x] Separar `folha_holerite` e `folha_impostos` nas `DemandRule` iniciais.

Nada de tabela de feriados. Nada de cálculo de dia útil. O analista digita o prazo.

---

## Etapa 6 — Lista de demandas (concluída)

Depende de: 5.2.

- [x] `/demandas` — lista global de demandas confirmadas.
- [x] Filtros: empresa, status, categoria, prazo, responsável.
- [x] Busca por assunto e remetente.
- [x] Mudança de status via Server Action, passando por `lib/demand.ts`.
- [x] Atribuição de responsável.
- [x] Edição de `dueDate` na linha, com aviso quando ausente.
- [x] Empty state, skeleton, erro inline.

---

## Etapa 7 — Página da empresa

Depende de: 6.

- [ ] `/empresas/[id]` — demandas por status e por prazo, histórico, responsáveis.
- [ ] Filtros e busca no escopo da empresa.
- [ ] Contagem de atrasadas e de vencendo. Ignora `sem_prazo` e status terminal.
- [ ] É a tela principal de preenchimento de `dueDate`.

---

## Etapa 8 — Home

Depende de: 7.

- [ ] Cards de empresa: abertas, vencendo, atrasadas, sem prazo, concluídas no período.
- [ ] Card de **Não classificado** com a contagem da fila de revisão.
- [ ] Nenhuma demanda não confirmada entra em qualquer contagem exceto a do card de revisão.

---

## Etapa 9 — Analítica

Depende de: 8 e da consolidação de categorias.

- [ ] Evolução de volume no tempo.
- [ ] Taxa de conclusão e de cancelamento.
- [ ] Tempo médio de atendimento (`closedAt − openedAt`).
- [ ] Cumprimento de prazo: concluídas dentro do `dueDate` vs. fora.
- [ ] Demandas por categoria e por analista.

**Pré-requisito:** promover `Demand.category` de texto livre a referência a uma tabela `Category`. Fazer antes de acumular dados, ou os gráficos nascem com categorias duplicadas por diferença de grafia.

---

## Backlog

- Tela de administração de `DemandRule`. Depende da decisão 2 abaixo.
- Sync em lotes paralelos. Só quando o número de analistas crescer.
- Retentativa automática em erro transitório do Graph.
- Extração automática de data do texto do e-mail, como sugestão. Só depois de medir o acerto sobre dados reais.
- `Demand.priority`, se os analistas precisarem.

---

## Decisões tomadas

- Prazo é **digitado** pelo analista, não calculado. Cada empresa tem acordos próprios.
- Sem tabela de feriados. Sem cálculo de dia útil.
- Prazo é preenchido **no dashboard**, não na revisão. A revisão confirma empresa e categoria, e nada mais.
- Quatro estados de prazo: `sem_prazo`, `no_prazo`, `vencendo`, `atrasada`.
- `sem_prazo` recebe aviso visual e nunca conta como `no_prazo`.
- `Folha de pagamento` são duas categorias, porque são dois prazos. Uma demanda, um prazo.

## Decisões pendentes

1. Uma empresa pode ter múltiplos domínios? *(schema já permite; confirmar)*
2. Quem cadastra as `DemandRule`? Define se há tela de administração.
3. Demandas precisam de prioridade, além do prazo?
