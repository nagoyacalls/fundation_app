import Link from "next/link";
import { notFound } from "next/navigation";

import { DemandFilters } from "../../demandas/demand-filters";
import { DemandRow } from "../../demandas/demand-row";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import {
  deadlineCounts,
  deadlineState,
  DEADLINE_STATES,
  type DeadlineState,
} from "@/lib/deadline";
import { demandStatusSchema, type DemandStatus } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

// Dashboard da empresa: a tela principal de preenchimento de dueDate
// (docs/prazos.md). Acesso garantido pelo middleware.

interface SearchParams {
  [key: string]: string | string[] | undefined;
}

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function EmpresaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: { domains: { orderBy: { domain: "asc" } } },
  });
  if (!company) {
    notFound();
  }

  const sp = await searchParams;
  const q = single(sp.q);
  const categoria = single(sp.categoria);
  const resp = single(sp.resp);
  const statusParsed = demandStatusSchema.safeParse(single(sp.status));
  const status: DemandStatus | null = statusParsed.success ? statusParsed.data : null;
  const prazoRaw = single(sp.prazo);
  const prazo: DeadlineState | null = (DEADLINE_STATES as readonly string[]).includes(prazoRaw)
    ? (prazoRaw as DeadlineState)
    : null;

  const where: Prisma.DemandWhereInput = {
    companyId: id,
    // Palpite não entra em indicador nem na carteira (CLAUDE.md).
    classificationConfirmed: true,
    ...(status ? { status } : {}),
    ...(categoria ? { categoryId: categoria } : {}),
    ...(resp ? { assigneeId: resp === "sem" ? null : resp } : {}),
    ...(q
      ? {
          email: {
            OR: [
              { subject: { contains: q, mode: "insensitive" } },
              { senderEmail: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [demands, allConfirmed, users, categories] = await Promise.all([
    prisma.demand.findMany({
      where,
      include: {
        email: { select: { subject: true, senderEmail: true, webLink: true } },
        category: { select: { name: true } },
      },
      orderBy: { openedAt: "desc" },
    }),
    // Contadores sempre sobre a carteira inteira da empresa, não o filtro.
    prisma.demand.findMany({
      where: { companyId: id, classificationConfirmed: true },
      select: { dueDate: true, status: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { demands: { some: { companyId: id, classificationConfirmed: true } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const now = new Date();
  const counts = deadlineCounts(allConfirmed, now);
  const rows = demands
    .map((demand) => ({ demand, deadline: deadlineState(demand.dueDate, demand.status, now) }))
    .filter((row) => prazo === null || row.deadline === prazo);

  const hasFilters = Boolean(q || categoria || resp || status || prazo);

  const counters = [
    { label: "Em aberto", value: counts.emAberto, alert: false },
    { label: "Vencendo", value: counts.vencendo, alert: false },
    { label: "Atrasadas", value: counts.atrasada, alert: counts.atrasada > 0 },
    { label: "Sem prazo", value: counts.semPrazo, alert: false },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-9 max-lg:p-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-bold">{company.name}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {company.domains.length > 0
              ? company.domains.map((route) => route.domain).join(" · ")
              : "nenhum domínio roteado"}
          </p>
        </div>
        <Link
          href="/demandas"
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
        >
          Todas as demandas
        </Link>
      </div>

      <dl className="grid grid-cols-4 gap-4">
        {counters.map((counter, index) => (
          <div
            key={counter.label}
            className="animate-fade-up rounded-2xl border bg-card p-5"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <dt className="text-[13px] text-muted-foreground">{counter.label}</dt>
            <dd
              className={`mt-1 text-[28px] font-bold tabular-nums ${
                counter.alert ? "text-destructive" : ""
              }`}
            >
              {counter.value}
            </dd>
          </div>
        ))}
      </dl>

      <DemandFilters users={users} categories={categories} />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "Nenhuma demanda com esses filtros."
              : "Nenhuma demanda confirmada para esta empresa."}
          </p>
          <Button asChild variant="outline" size="sm">
            {hasFilters ? (
              <Link href={`/empresas/${company.id}`}>Limpar filtros</Link>
            ) : (
              <Link href="/revisao">Ir para a Revisão</Link>
            )}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <ul className="flex flex-col">
          {rows.map(({ demand, deadline }) => (
            <DemandRow
              key={demand.id}
              demand={{
                id: demand.id,
                subject: demand.email?.subject ?? "(sem assunto)",
                senderEmail: demand.email?.senderEmail ?? "",
                webLink: demand.email?.webLink ?? null,
                companyId: null,
                companyName: null,
                category: demand.category?.name ?? null,
                status: demand.status,
                assigneeId: demand.assigneeId,
                dueDate: demand.dueDate?.toISOString().slice(0, 10) ?? null,
                deadline,
              }}
              users={users}
            />
          ))}
          </ul>
        </div>
      )}
    </main>
  );
}
