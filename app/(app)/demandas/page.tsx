import Link from "next/link";

import { DemandFilters } from "./demand-filters";
import { DemandRow } from "./demand-row";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { deadlineState, DEADLINE_STATES, type DeadlineState } from "@/lib/deadline";
import { demandStatusSchema, type DemandStatus } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

// Acesso garantido pelo middleware. Filtros vivem na URL: compartilháveis,
// sem estado global, e o Server Component refaz a busca a cada mudança.

interface SearchParams {
  [key: string]: string | string[] | undefined;
}

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function DemandasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = single(params.q);
  const empresa = single(params.empresa);
  const categoria = single(params.categoria);
  const resp = single(params.resp);
  const statusParsed = demandStatusSchema.safeParse(single(params.status));
  const status: DemandStatus | null = statusParsed.success ? statusParsed.data : null;
  const prazoRaw = single(params.prazo);
  const prazo: DeadlineState | null = (DEADLINE_STATES as readonly string[]).includes(prazoRaw)
    ? (prazoRaw as DeadlineState)
    : null;

  const where: Prisma.DemandWhereInput = {
    // Só demandas confirmadas: palpite não aparece na carteira (CLAUDE.md).
    classificationConfirmed: true,
    ...(empresa ? { companyId: empresa } : {}),
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

  const [demands, companies, users, categories] = await Promise.all([
    prisma.demand.findMany({
      where,
      include: {
        email: { select: { subject: true, senderEmail: true, webLink: true } },
        company: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { openedAt: "desc" },
    }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    // Só categorias em uso por demandas confirmadas: filtro sem opção morta.
    prisma.category.findMany({
      where: { demands: { some: { classificationConfirmed: true } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Estado de prazo é derivado (lib/deadline.ts) — o filtro aplica a mesma
  // função da exibição, nunca uma cópia da regra em SQL.
  const now = new Date();
  const rows = demands
    .map((demand) => ({ demand, deadline: deadlineState(demand.dueDate, demand.status, now) }))
    .filter((row) => prazo === null || row.deadline === prazo);

  const hasFilters = Boolean(q || empresa || categoria || resp || status || prazo);

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-9 max-lg:p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[22px] font-bold">Demandas</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? "Nenhum resultado"
            : `${rows.length} demanda${rows.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <DemandFilters companies={companies} users={users} categories={categories} />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "Nenhuma demanda com esses filtros."
              : "Nenhuma demanda confirmada ainda."}
          </p>
          <Button asChild variant="outline" size="sm">
            {hasFilters ? (
              <Link href="/demandas">Limpar filtros</Link>
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
                companyId: demand.companyId,
                companyName: demand.company?.name ?? null,
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
