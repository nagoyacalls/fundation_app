# Prazos

Leia ao mexer em `lib/deadline.ts`, na fila de revisão ou em qualquer indicador.

## Modelo

Cada demanda tem um `dueDate` **opcional**: a data em que ela deve ser entregue.

O prazo é **digitado pelo analista**, não calculado pelo sistema. Cada empresa tem seus acordos, e o analista conhece o caso individual. O sistema não infere prazo, não conta dias úteis e não conhece feriados.

Os prazos usuais servem de referência para o analista, não de regra de cálculo:

| Categoria | Referência usual |
|---|---|
| Admissão | um dia útil antes da efetivação |
| Férias | dois dias úteis antes do primeiro dia |
| Folha — holerites | até o 5º dia útil do mês |
| Folha — impostos | até o dia 20 |

Nada disso vive no código. Vive na cabeça do analista e, se útil, num texto de ajuda na interface.

## Onde o prazo é preenchido

**Não na fila de revisão.** A revisão confirma apenas empresa e categoria — ela é o portão de veracidade, e deve ser rápida.

O `dueDate` é preenchido e editado **no dashboard da empresa**, diretamente na linha da demanda. A qualquer momento, quantas vezes for preciso.

Motivo: `dueDate` é uma lacuna, não um dado falso. Uma demanda sem prazo é honesta sobre o que não sabe. Uma demanda com empresa errada mente para o gráfico.

## Estados de prazo

Derivados, nunca persistidos. Calculados por função pura em `lib/deadline.ts` a partir de `dueDate`, `status` e da data corrente.

| Estado | Condição |
|---|---|
| `sem_prazo` | `dueDate` é nulo |
| `no_prazo` | vence em mais de 1 dia |
| `vencendo` | vence hoje ou amanhã |
| `atrasada` | `dueDate` passou e `status` não é terminal |

Demanda com status terminal (`concluida`, `cancelada`) nunca é `atrasada` nem `vencendo`. Foi entregue; o prazo deixou de correr.

`sem_prazo` **não é** `no_prazo`. Não conte uma como a outra. Um contador de "no prazo" que engorda com demandas sem data é um contador mentiroso.

## Interface

- `sem_prazo` — aviso visual discreto ("sem prazo definido"), com o campo de data editável ali mesmo. O aviso torna o esquecimento visível.
- `vencendo` — destaque. É o que o analista precisa ver ao abrir o sistema de manhã.
- `atrasada` — destaque forte. Cor reservada a estado, conforme `docs/ui.md`.
- `no_prazo` — sem destaque.

## Indicadores

- Contagem de atraso ignora `sem_prazo` e ignora status terminal.
- Todo painel que mostre "no prazo" deve mostrar "sem prazo" ao lado. Nunca esconda a lacuna somando-a ao que está bem.
- Demanda com `classificationConfirmed = false` não entra em nenhum indicador, inclusive os de prazo. Invariante do `CLAUDE.md`.

## Categorias

`Folha de pagamento` tem dois prazos de natureza distinta. Logo, são duas categorias: `folha_holerite` e `folha_impostos`.

Regra geral: **uma demanda, um prazo.** Se algo tem dois prazos, são duas demandas.
