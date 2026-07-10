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

## Etapa 5.1 — Correções (agora, antes de qualquer tela nova)

Diagnóstico completo em `REVISAO.md`.

- [ ] **`syncStatus` separado do `refreshToken`.** *(crítico)*
  `User` ganha `syncStatus` (`pendente | ativo | reauth_required`), `lastSyncAt`, `lastSyncError`.
  `/api/sync` filtra por `syncStatus`, nunca por token nulo. Em `GraphAuthError`, marca `reauth_required` e **mantém** o token.
  `signIn` grava `ativo` ao receber token novo; força `prompt: "consent"` quando o status for `reauth_required`.
  Sem isso, a conta que expira nunca volta a sincronizar — e ninguém percebe.
  Teste obrigatório: expirar → relogar → voltar a sincronizar.

- [ ] **Banner de reconexão.** No layout: se o usuário logado está em `reauth_required`, faixa com botão de reconectar. Exigido por `docs/sync.md`.

- [ ] **`middleware.ts`.** Protege tudo por padrão; libera `/login` e `/api/auth`. Remove as verificações copiadas em cada página.

- [ ] **`lib/demand.ts`.** Único caminho autorizado a mudar `status` e gravar `closedAt`, validado por `demandSchema`. Hoje a regra existe, está testada, e nada a executa.

---

## Etapa 5.2 — Prazos

Depende de: 5.1. Especificação em `docs/prazos.md`.

- [ ] `Demand.dueDate` (`DateTime?`) no schema + migration.
- [ ] `lib/deadline.ts` — função pura `deadlineState(dueDate, status, now)` → `sem_prazo | no_prazo | vencendo | atrasada`. Status terminal nunca é `vencendo` nem `atrasada`.
- [ ] Testes: cada estado, fronteira do "vence amanhã", status terminal com prazo vencido, prazo nulo.
- [ ] Separar `folha_holerite` e `folha_impostos` nas `DemandRule` iniciais.

Nada de tabela de feriados. Nada de cálculo de dia útil. O analista digita o prazo.

---

## Etapa 6 — Lista de demandas

Depende de: 5.2.

- [ ] `/demandas` — lista global de demandas confirmadas.
- [ ] Filtros: empresa, status, categoria, prazo, responsável.
- [ ] Busca por assunto e remetente.
- [ ] Mudança de status via Server Action, passando por `lib/demand.ts`.
- [ ] Atribuição de responsável.
- [ ] Edição de `dueDate` na linha, com aviso quando ausente.
- [ ] Empty state, skeleton, erro inline.

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
