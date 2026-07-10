# CLAUDE.md

Contrato de engenharia. Se um pedido conflitar com este arquivo, pergunte antes de prosseguir.

## Produto

Sistema interno do Departamento Pessoal. O Outlook segue como canal oficial; este sistema é uma camada de organização e indicadores sobre os e-mails recebidos. Cada e-mail vira uma **demanda** rastreável, atribuída a uma **empresa** pelo domínio do remetente e classificada por tipo a partir do conteúdo.

Usuários: analistas internos. Velocidade de uso importa mais que efeito visual.

## Stack

Deliberadamente pequena. Pergunte antes de adicionar qualquer dependência.

Next.js (App Router) · TypeScript strict · Auth.js + Entra ID · Postgres + Prisma · Zod · Tailwind + shadcn/ui · Vitest

Sem biblioteca de estado global. React state e Server Components.

## Comandos

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Concluído significa os quatro passando. Sempre nesta ordem.

## Invariantes

Valem em toda tarefa. Violação é bug.

- Demanda pertence à **empresa**, não ao usuário. `assigneeId` é atribuição, nunca fronteira de acesso. Todo analista enxerga toda a carteira.
- Nunca armazenar nem logar corpo de e-mail. Só metadados e preview; abrir no Outlook via `webLink`.
- Demanda com `classificationConfirmed = false` **não entra em nenhum indicador**.
- A fila de revisão confirma **empresa e categoria**, e nada mais.
- `dueDate` é opcional e digitado pelo analista. `sem_prazo` nunca conta como `no_prazo`.
- Estado de prazo é **derivado**, nunca persistido. Só `lib/demand.ts` grava `status` e `closedAt`.
- `syncStatus` é o único sinal de que uma conta pode sincronizar. Nunca use `refreshToken = null` como sinal, e nunca apague o token para sinalizar erro.
- Escritas via Server Action, validadas por Zod. Actions retornam `{ ok: true, data } | { ok: false, error }`.
- Server Component por padrão; `"use client"` só em folha interativa.
- Regra de negócio fora de componente, em `lib/`, como função pura testada.
- `prisma/schema.prisma` é a fonte de verdade — não descreva o schema em outro lugar.
- Segredo só no servidor. Nunca editar `components/ui/` à mão.
- Rota protegida por `middleware.ts`, não por verificação copiada em cada página. Segurança é opt-out.

## Comportamento

- Menor mudança completa que atenda ao pedido. Resolva o problema de hoje, não requisitos hipotéticos.
- Escalabilidade vem de modelo de dados correto, não de camada genérica. Sem plugin system, sem engine de regras genérica, sem framework de dashboard.
- Estenda o que existe antes de escrever novo. Siga os padrões do projeto antes de inventar outros.
- Implemente por completo. Sem `TODO`, sem solução descartável.
- Nunca invente regra de negócio. Se a implementação depender de requisito ausente, faça **uma** pergunta.
- Empate entre soluções: correção → simplicidade → manutenibilidade → performance → elegância.
- Atue como Tech Lead: aponte riscos e proponha simplificações antes de implementar.
- Comentários explicam *por quê*, nunca *o quê*.

## Fluxo

Incremental. **Uma etapa por vez.** Nunca um bloco grande de uma vez.

Compreenda → proponha plano curto → implemente **uma** etapa → valide → avance.

Cada etapa deixa o sistema funcionando. Commits convencionais, uma mudança lógica cada.

## Referências

Leia apenas quando a tarefa exigir.

- Domínio, roteamento, classificação, ciclo da demanda: @docs/dominio.md
- Prazos e estados de prazo: @docs/prazos.md
- Sync do Outlook via Graph: @docs/sync.md
- Interface e componentes: @docs/ui.md
- Schema: `prisma/schema.prisma`
- Estado e próximos passos: `ROADMAP.md`
