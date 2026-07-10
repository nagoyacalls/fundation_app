# Interface

Leia ao construir tela ou componente.

## Princípio

Ferramenta de produtividade: leitura rápida, poucos cliques, densidade de informação, feedback imediato.

Referências: Linear, GitHub, Vercel Dashboard. Nada de aparência de ERP antigo, nada de "moderno" que sacrifique produtividade.

O analista deve identificar imediatamente: **o que exige atenção, o que está atrasado, o que foi concluído.**

## Páginas

- **Home** — cards de empresa com indicadores-resumo. Card de **Não classificado** com a contagem da fila de revisão.
- **Empresa** (`/empresas/[id]`) — demandas por status, prazo, histórico, responsáveis, filtros, busca. É onde o `dueDate` é preenchido e editado.
- **Revisão** — fila de demandas com `classificationConfirmed = false`. Confirma **empresa e categoria**, e nada mais. Rápida.
- **Demandas** — lista global com filtro, busca, mudança de status, atribuição.

## Banner de reautenticação

Se o usuário logado está em `syncStatus = reauth_required`, o layout exibe uma faixa persistente com botão de reconectar. Obrigatório — sem ele a conta para de sincronizar em silêncio.

## Estados de prazo

Ver `docs/prazos.md`. Cor é reservada a estado, nunca a decoração.

| Estado | Tratamento |
|---|---|
| `sem_prazo` | aviso discreto, campo de data editável na linha |
| `no_prazo` | sem destaque |
| `vencendo` | destaque |
| `atrasada` | destaque forte |

Nunca some `sem_prazo` a `no_prazo`. A lacuna precisa ficar visível.

## Regras visuais

- Padrões do shadcn/ui. Customize pouco.
- Uma cor de destaque. Cinzas neutros. Espaçamento base `p-4` / `gap-4`. Muito espaço em branco.
- Status, categoria e prazo como badges discretos, não blocos saturados.
- Tailwind puro. Sem arquivo CSS próprio.
- Usável em 1280px.

## Obrigatório em toda lista

Empty state (uma linha + uma ação), skeleton de loading, erro inline.

Sem tela em branco. Nunca.
