import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { deadlineCounts } from "@/lib/deadline";
import { countConcludedSince } from "@/lib/demand";

// Home: um card por empresa com os indicadores-resumo, e o card de Não
// classificado com a fila de revisão. Demanda não confirmada não entra em
// NENHUMA contagem além da fila (invariante do CLAUDE.md).

const CONCLUDED_WINDOW_DAYS = 30;

export default async function Home() {
  const [companies, reviewQueueCount] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      include: {
        demands: {
          where: { classificationConfirmed: true },
          select: { dueDate: true, status: true, closedAt: true },
        },
      },
    }),
    prisma.demand.count({ where: { classificationConfirmed: false } }),
  ]);

  const now = new Date();
  const since = new Date(now.getTime() - CONCLUDED_WINDOW_DAYS * 86_400_000);

  const cards = companies
    .map((company) => ({
      id: company.id,
      name: company.name,
      counts: deadlineCounts(company.demands, now),
      concluidas: countConcludedSince(company.demands, since),
    }))
    // O que exige atenção vem primeiro (docs/ui.md).
    .sort(
      (a, b) =>
        b.counts.atrasada - a.counts.atrasada ||
        b.counts.vencendo - a.counts.vencendo ||
        a.name.localeCompare(b.name),
    );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Carteira</h1>
        <p className="text-sm text-muted-foreground">
          {cards.length === 0
            ? "Nenhuma empresa"
            : `${cards.length} empresa${cards.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <Link
        href="/revisao"
        className="flex items-center justify-between rounded-md border border-dashed p-4 transition-colors hover:bg-accent"
      >
        <div>
          <p className="text-sm font-medium">Não classificado</p>
          <p className="text-xs text-muted-foreground">
            demandas aguardando confirmação de empresa e categoria
          </p>
        </div>
        {reviewQueueCount > 0 ? (
          <Badge>{reviewQueueCount}</Badge>
        ) : (
          <Badge variant="outline">0</Badge>
        )}
      </Link>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma empresa na carteira ainda — elas nascem na revisão.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/revisao">Ir para a Revisão</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={`/empresas/${card.id}`}
                className="flex h-full flex-col gap-4 rounded-md border p-4 transition-colors hover:bg-accent"
              >
                <p className="truncate text-sm font-medium">{card.name}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <Indicator label="Em aberto" value={card.counts.emAberto} />
                  <Indicator
                    label="Vencendo"
                    value={card.counts.vencendo}
                    tone={card.counts.vencendo > 0 ? "warn" : undefined}
                  />
                  <Indicator
                    label="Atrasadas"
                    value={card.counts.atrasada}
                    tone={card.counts.atrasada > 0 ? "alert" : undefined}
                  />
                  <Indicator label="Sem prazo" value={card.counts.semPrazo} />
                  <Indicator
                    label={`Concluídas · ${CONCLUDED_WINDOW_DAYS}d`}
                    value={card.concluidas}
                  />
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Indicator({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn" | "alert";
}) {
  const valueClass =
    tone === "alert"
      ? "text-destructive font-semibold"
      : tone === "warn"
        ? "font-semibold"
        : "";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
