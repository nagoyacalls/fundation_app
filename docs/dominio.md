# Domínio

Leia ao mexer em `lib/routing.ts`, `lib/classification.ts`, `lib/demand.ts` ou no schema.

## Entidades

- **User** — analista. Login via Entra ID. Guarda o refresh token do Graph (criptografado), o `deltaLink` e o `syncStatus`.
- **Company** — empresa da carteira.
- **CompanyDomain** — `domain` (único) → `companyId`. Tabela de roteamento.
- **Email** — registro sincronizado do Outlook. Metadados e preview apenas.
- **Demand** — a unidade de trabalho. Tem ciclo de vida próprio e sobrevive à mensagem que a originou.
- **DemandRule** — `pattern` → `category`. Base da classificação.

`Email` e `Demand` são separados de propósito: o histórico e os indicadores não podem depender do que ainda existe na caixa do Outlook.

## Estado de sincronização do usuário

`syncStatus` é `pendente | ativo | reauth_required`.

Ele é o **único** sinal de que uma conta pode ou não sincronizar. Nunca use `refreshToken = null` como sinal — um campo com dois significados produz bug. Um token nulo pode ser um usuário novo ou uma conta expirada; `syncStatus` distingue.

- `pendente` — nunca conectou.
- `ativo` — sincronizando.
- `reauth_required` — o Graph recusou o token; só um novo login resolve. A interface **precisa** avisar (ver `docs/sync.md`).

Ao entrar em `reauth_required`, **não apague o `refreshToken`.** Apagá-lo é o que impede a conta de voltar.

## Roteamento (`lib/routing.ts`)

Resolve `senderDomain` contra `CompanyDomain`.

Sem correspondência, a demanda entra em **Não classificado** e aparece na fila de revisão. Quando o analista atribui a empresa manualmente, grave um novo `CompanyDomain` — o mesmo remetente resolve sozinho na próxima vez.

Domínios genéricos (gmail, hotmail, outlook) nunca viram regra. Bloqueio na escrita, não na leitura.

## Classificação (`lib/classification.ts`)

Casa assunto e preview contra `DemandRule` ativas. Determinístico, sem LLM. Se um classificador melhor entrar um dia, entra atrás desta mesma interface.

Múltiplas regras casando: a demanda vai para revisão com a primeira sugestão. Nenhuma regra casando: sem categoria, vai para revisão.

O resultado é sempre **sugestão**. Enquanto `classificationConfirmed` for falso, a demanda fica na fila de revisão e não entra em nenhum indicador. Um palpite errado não pode contaminar o dashboard.

## Fila de revisão

Confirma **empresa e categoria**, e nada mais. É o portão de veracidade: até passar por ele, o que o sistema sabe sobre a demanda é palpite.

Prazo não se confirma aqui — ver `docs/prazos.md`.

## Categorias

Uma demanda, um prazo. `folha_holerite` e `folha_impostos` são categorias distintas porque têm prazos de natureza distinta.

`Demand.category` é texto livre hoje. Antes de construir os indicadores, promover a uma tabela `Category` — grafias divergentes ("Férias", "ferias") viram categorias distintas no gráfico.

## Ciclo da demanda

```
aberta → em_andamento → concluida
                      → cancelada
```

`openedAt` na criação. `closedAt` ao entrar em `concluida` ou `cancelada`. Nunca preencher `closedAt` sem status terminal.

`lib/demand.ts` é o **único** caminho autorizado a mudar `status` e gravar `closedAt`. Regra que depende de alguém lembrar de chamá-la não é regra.

## Prazo

`dueDate` opcional, digitado pelo analista no dashboard. Ver `docs/prazos.md`.
