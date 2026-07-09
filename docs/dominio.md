# Domínio

Leia ao mexer em `lib/routing.ts`, `lib/classification.ts` ou no schema.

## Entidades

- **User** — analista. Login via Entra ID. Guarda refresh token do Graph (criptografado) e `deltaLink`.
- **Company** — empresa da carteira.
- **CompanyDomain** — `domain` (único) → `companyId`. Tabela de roteamento.
- **Email** — registro sincronizado do Outlook. Metadados e preview apenas.
- **Demand** — a unidade de trabalho. Tem ciclo de vida próprio e sobrevive à mensagem que a originou.
- **DemandRule** — `pattern` → `category`. Base da classificação.

`Email` e `Demand` são separados de propósito: o histórico e os indicadores não podem depender do que ainda existe na caixa do Outlook.

## Roteamento (`lib/routing.ts`)

Resolve `senderDomain` contra `CompanyDomain`.

Sem correspondência, a demanda entra em **Não classificado** e aparece na home. Quando o analista atribui a empresa manualmente, grave um novo `CompanyDomain` — o mesmo remetente resolve sozinho na próxima vez.

Domínios genéricos (gmail, hotmail, outlook) nunca devem ser gravados como regra. Bloqueie na escrita, não na leitura.

## Classificação (`lib/classification.ts`)

Casa assunto e preview contra `DemandRule` ativas. Determinístico e testável.

**Não implemente classificador por LLM.** Se a acurácia se mostrar insuficiente, ele entra depois atrás da mesma interface, sem mudar o resto do sistema.

Múltiplas regras casando: a demanda vai para revisão com a primeira sugestão. Nenhuma regra casando: sem categoria, vai para revisão.

O resultado é sempre **sugestão**. Enquanto `classificationConfirmed` for falso, a demanda fica na fila de revisão e não entra em nenhum indicador. Um palpite errado não pode contaminar o dashboard.

## Ciclo da demanda

```
aberta → em_andamento → concluida
                      → cancelada
```

`openedAt` na criação. `closedAt` ao entrar em `concluida` ou `cancelada`. Nunca preencher `closedAt` sem status terminal.
