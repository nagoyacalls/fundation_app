# Revisão de Código — fundation_app

Data: 10/07/2026 · Escopo: etapas 1 a 5

---

## Veredito

Código **acima da média**. Arquitetura correta, regras de negócio isoladas e testadas, contrato do `CLAUDE.md` seguido nos detalhes — inclusive nos que costumam ser ignorados, como nunca armazenar corpo de e-mail e bloquear domínios genéricos na escrita.

Um **bug crítico**, dois problemas médios, alguns pontos menores.

Não avance para telas novas antes de corrigir o crítico. É barato agora, caro depois.

---

## O que está muito bom

**Separação entre regra de negócio e infraestrutura.** As decisões importantes — a qual empresa um e-mail pertence, que tipo de demanda é — vivem em `lib/routing.ts` e `lib/classification.ts` como funções puras: mesma entrada, mesma saída, sem tocar banco nem rede. Por isso são testáveis sem subir nada. Se as regras mudarem, mexe-se em dois arquivos pequenos.

**Cobertura de testes.** 68 testes, ~790 linhas, cobrindo os casos difíceis: delta expirado, rate limit persistente, token revogado, e "rodei a sincronização duas vezes, não pode duplicar demanda". É o tipo de erro que só aparece em produção de madrugada.

**Criptografia do token.** AES-256-GCM, que é *autenticado*: dado adulterado no banco faz a decifragem falhar, em vez de devolver lixo em silêncio. Com teste de que o segredo nunca é persistido em claro.

**A porta `IngestionStore`.** Interface que descreve as três operações de banco da ingestão. O Prisma fica na rota; os testes usam implementação falsa em memória. Permite testar idempotência sem banco algum. Sinal de maturidade.

**Tratamento de `410 Gone`.** Quando o cursor do delta expira, o código reinicia do zero, descarta o parcial, e o `upsert` por `graphId` garante que o backlog repetido não duplique nada. Detalhe que a maioria erra.

---

## Bug crítico

### A conta que perde o token nunca mais volta a sincronizar

Quando o Graph rejeita o token de um usuário, `app/api/sync/route.ts` grava `refreshToken = null` para sinalizar "precisa de novo login".

Mas `lib/auth.ts`, no login, só grava o campo se o Entra devolver um token novo:

```ts
update: {
  name: ...,
  ...(encryptedRefreshToken ? { refreshToken: encryptedRefreshToken } : {}),
}
```

E o Entra **frequentemente não devolve** refresh token quando a sessão SSO ainda está ativa e o consentimento já foi dado. Ele assume que você já tem um.

Sequência real:

1. Token expira. Sync grava `refreshToken = null`.
2. Analista faz login de novo, com sucesso.
3. Entra não devolve refresh token.
4. O código pula o campo. `refreshToken` continua `null`.
5. O próximo sync ignora o usuário — filtra por `refreshToken: { not: null }`.
6. **A caixa desse analista para de gerar demandas. Ninguém percebe.**

Falha silenciosa: sem erro, sem log, sem alerta. Só demandas que deixam de existir. Para um sistema cujo propósito é não perder demandas, é a pior falha possível.

**Causa raiz.** `refreshToken = null` faz dois trabalhos: "usuário novo" e "conta expirada". Um campo, dois significados. Sempre que isso acontece, nasce um bug.

**Correção.** `User` ganha `syncStatus` (`pendente | ativo | reauth_required`), `lastSyncAt`, `lastSyncError`. O sync filtra por status, não por token nulo. Em `GraphAuthError`, marca `reauth_required` e **mantém** o token. No novo login, quando o status for `reauth_required`, força `prompt: "consent"` para garantir que o Entra devolva um token.

Único item bloqueante deste relatório.

---

## Problemas médios

### 1. O banner de re-login não existe

`docs/sync.md` exige: *"marcar conta para novo login e exibir banner. Não falhe em silêncio."*

A rota marca. Nenhuma tela exibe — a palavra só aparece num comentário dentro da própria rota. Mesmo depois de corrigir o bug crítico, o analista não saberá que sua conta parou.

### 2. Regra de `closedAt` escrita e inerte

`demandSchema` contém a regra "`closedAt` só com status terminal". Está testada. E **nada no sistema a executa** — o schema não é chamado em lugar nenhum fora dos testes.

Quando a tela de mudança de status chegar, se o desenvolvedor não lembrar de invocá-lo, a regra não vale. Regra que depende de memória é sugestão.

Isso ameaça uma invariante do próprio `CLAUDE.md`: *"indicadores derivam de `openedAt`, `closedAt` e `status`."* `closedAt` inconsistente contamina toda a analítica.

Correção: `lib/demand.ts`, único caminho autorizado a gravar `status` e `closedAt`.

### 3. Sem proteção centralizada de rotas

Cada página repete `if (!session?.user) redirect("/login")`. Funciona, mas é *opt-in*: a proteção existe porque alguém lembrou. A décima página criada às pressas ficará aberta.

Não há `middleware.ts`. Segurança deve ser opt-out.

---

## Pontos menores

**Sync sequencial.** O loop sobre usuários processa um por vez. Com 5 analistas, ótimo. Com 50, o cron pode estourar o tempo limite. Anote; não implemente.

**`Demand.category` é texto livre.** "Férias", "ferias" e "FÉRIAS" viram três categorias no gráfico. Promova a tabela `Category` antes de acumular dados.

**`Demand.priority` foi removido.** Confirme se foi intencional.

**A home é placeholder.** Esperado nesta fase.

---

## Aderência ao CLAUDE.md

| Invariante | Situação |
|---|---|
| Demanda pertence à empresa | Cumprido |
| Nunca armazenar corpo de e-mail | Cumprido |
| Não confirmada não entra em indicador | Estrutura correta |
| Server Action valida por Zod e retorna `{ ok }` | Cumprido |
| Server Component por padrão | Cumprido |
| Regra de negócio em `lib/`, pura, testada | Cumprido, exemplarmente |
| `schema.prisma` é fonte de verdade | Cumprido |
| Segredo só no servidor | Cumprido, cifrado em repouso |
| Sem `TODO` | Cumprido |
| `closedAt` só com status terminal | Escrito, não executado |
| Banner de reautenticação | Ausente |
| Rota protegida centralmente | Ausente |

**Nota de processo.** O `CLAUDE.md` manda uma etapa por vez. Foram entregues cinco. O bug do token nasceu exatamente na fronteira entre a etapa 2 e a 3 — o ponto que ninguém revisou porque as duas vieram juntas. Volte ao ritmo original.

---

## Resumo

Fundação sólida. Um bug de estado que faz uma conta parar de sincronizar em silêncio — corrija primeiro. Duas dívidas médias e uma melhoria barata de segurança.

Ajustes, não reconstrução.
