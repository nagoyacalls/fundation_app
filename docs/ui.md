# Interface

Leia ao construir tela ou componente.

## Princípio

Ferramenta de produtividade: leitura rápida, poucos cliques, densidade de informação, feedback imediato.

Referências: Linear, GitHub, Vercel Dashboard. Nada de aparência de ERP antigo, nada de "moderno" que sacrifique produtividade.

O analista deve identificar imediatamente: **o que exige atenção, o que está atrasado, o que foi concluído.**

## Páginas

- **Home** — cards de empresa com indicadores-resumo (abertas, atrasadas, concluídas no período). Card de **Não classificado** quando houver pendência de revisão.
- **Empresa** (`/empresas/[id]`) — demandas por status, atrasadas, histórico, responsáveis, gráficos, filtros, busca.
- **Revisão** — fila de demandas com `classificationConfirmed = false`. Confirma empresa e categoria.
- **Demandas** — lista global com filtro, busca, mudança de status, atribuição.

## Regras visuais

- Padrões do shadcn/ui. Customize pouco.
- Uma cor de destaque. Cor é reservada para **estado** (atrasado, urgente), nunca para decoração.
- Cinzas neutros. Espaçamento base `p-4` / `gap-4`. Muito espaço em branco.
- Status e prioridade como badges discretos, não blocos saturados.
- Tailwind puro. Sem arquivo CSS próprio.
- Usável em 1280px.

## Obrigatório em toda lista

Empty state (uma linha + uma ação), skeleton de loading, erro inline.

Sem tela em branco. Nunca.
