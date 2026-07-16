import Link from "next/link";

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
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 p-9 max-lg:p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[22px] font-bold">Carteira</h1>
        <p className="text-sm text-muted-foreground">
          {cards.length === 0
            ? "Nenhuma empresa"
            : `${cards.length} empresa${cards.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <Link
        href="/revisao"
        className="group flex animate-fade-up items-center justify-between rounded-2xl border border-dashed border-input p-5 transition-all duration-150 hover:scale-[1.01] hover:bg-card hover:shadow-md active:scale-100"
      >
        <div>
          <p className="text-sm font-medium">Não classificado</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            demandas aguardando confirmação de empresa e categoria
          </p>
        </div>
        <span
          className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-transform duration-150 group-hover:scale-110 ${
            reviewQueueCount > 0
              ? "bg-brand-muted text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {reviewQueueCount}
        </span>
      </Link>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma empresa na carteira ainda — elas nascem na revisão.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/revisao">Ir para a Revisão</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {cards.map((card, index) => (
            <li
              key={card.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <Link
                href={`/empresas/${card.id}`}
                className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-5 transition-all duration-150 hover:scale-[1.02] hover:border-input hover:shadow-lg active:scale-[0.99]"
              >
                <p className="truncate text-sm font-semibold">{card.name}</p>
                <dl className="flex flex-col gap-2">
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
    <div className="flex items-baseline justify-between gap-3">
      <dt className="whitespace-nowrap text-[13px] text-muted-foreground">
        {label}
      </dt>
      <dd className={`text-sm tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
