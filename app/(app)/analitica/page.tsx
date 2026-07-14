import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  averageResolutionDays,
  countByLabel,
  deadlineCompliance,
  statusRates,
  volumeByMonth,
  type AnalyticsDemand,
} from "@/lib/analytics";
import { prisma } from "@/lib/db";

// Analítica (ROADMAP etapa 9). Tudo derivado de openedAt/closedAt/status/
// dueDate por lib/analytics.ts; só demandas confirmadas entram.

const VOLUME_MONTHS = 6;

const monthLabelFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const label = monthLabelFormat.format(new Date(Date.UTC(year, month - 1, 1)));
  return `${label.replace(".", "")}/${String(year).slice(2)}`;
}

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default async function AnaliticaPage() {
  const rows = await prisma.demand.findMany({
    where: { classificationConfirmed: true },
    select: {
      status: true,
      openedAt: true,
      closedAt: true,
      dueDate: true,
      category: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  const demands: AnalyticsDemand[] = rows.map((row) => ({
    status: row.status,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    dueDate: row.dueDate,
    categoryName: row.category?.name ?? null,
    assigneeName: row.assignee?.name ?? null,
  }));

  if (demands.length === 0) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
        <h1 className="text-lg font-semibold">Analítica</h1>
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma demanda confirmada ainda — os indicadores nascem da revisão.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/revisao">Ir para a Revisão</Link>
          </Button>
        </div>
      </main>
    );
  }

  const now = new Date();
  const volume = volumeByMonth(demands, VOLUME_MONTHS, now);
  const maxVolume = Math.max(...volume.map((bucket) => bucket.total), 1);
  const rates = statusRates(demands);
  const avgDays = averageResolutionDays(demands);
  const compliance = deadlineCompliance(demands);
  const byCategory = countByLabel(
    demands.map((demand) => demand.categoryName),
    "sem categoria",
  );
  const byAssignee = countByLabel(
    demands.map((demand) => demand.assigneeName),
    "sem responsável",
  );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Analítica</h1>

      <dl className="grid grid-cols-4 gap-4">
        <StatTile label="Demandas confirmadas" value={String(rates.total)} />
        <StatTile
          label="Taxa de conclusão"
          value={percent(rates.concluidaRate)}
          detail={`${rates.concluida} concluída${rates.concluida === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Taxa de cancelamento"
          value={percent(rates.canceladaRate)}
          detail={`${rates.cancelada} cancelada${rates.cancelada === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Tempo médio de atendimento"
          value={avgDays === null ? "—" : `${avgDays.toFixed(1)} dias`}
          detail={avgDays === null ? "nenhuma concluída" : "da abertura à conclusão"}
        />
      </dl>

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-sm font-medium">
          Volume de demandas · últimos {VOLUME_MONTHS} meses
        </h2>
        <div className="flex h-36 items-end gap-2">
          {volume.map((bucket) => (
            <div
              key={bucket.month}
              className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch"
            >
              <span className="text-xs tabular-nums text-muted-foreground">
                {bucket.total}
              </span>
              <div
                className="w-full max-w-16 rounded-t-[4px] bg-primary"
                style={{ height: `${(bucket.total / maxVolume) * 100}%` }}
                aria-label={`${monthLabel(bucket.month)}: ${bucket.total}`}
              />
              <span className="text-xs text-muted-foreground">
                {monthLabel(bucket.month)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="mb-1 text-sm font-medium">Cumprimento de prazo</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          concluídas dentro do prazo digitado vs. fora; sem prazo fica visível,
          nunca somado
        </p>
        <dl className="grid grid-cols-3 gap-4">
          <StatTile label="Dentro do prazo" value={String(compliance.dentro)} />
          <StatTile
            label="Fora do prazo"
            value={String(compliance.fora)}
            alert={compliance.fora > 0}
          />
          <StatTile label="Concluídas sem prazo" value={String(compliance.semPrazo)} />
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <RankList title="Por categoria" rows={byCategory} />
        <RankList title="Por analista" rows={byAssignee} />
      </div>
    </main>
  );
}

function StatTile({
  label,
  value,
  detail,
  alert = false,
}: {
  label: string;
  value: string;
  detail?: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-md border p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`text-2xl font-semibold tabular-nums ${alert ? "text-destructive" : ""}`}
      >
        {value}
      </dd>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function RankList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; total: number }>;
}) {
  const max = Math.max(...rows.map((row) => row.total), 1);
  return (
    <section className="rounded-md border p-4">
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            <span className="w-36 truncate text-xs text-muted-foreground">
              {row.label}
            </span>
            <div className="h-2 flex-1 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${(row.total / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs tabular-nums">
              {row.total}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
