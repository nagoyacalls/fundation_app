import Link from "next/link";

import { ReviewItem } from "./review-item";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

// Acesso garantido pelo middleware.
export default async function RevisaoPage() {
  const [demands, companies] = await Promise.all([
    prisma.demand.findMany({
      where: { classificationConfirmed: false },
      include: {
        email: {
          select: {
            subject: true,
            preview: true,
            senderEmail: true,
            senderDomain: true,
            receivedAt: true,
            webLink: true,
          },
        },
        company: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { openedAt: "asc" },
    }),
    prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Revisão</h1>
        <p className="text-sm text-muted-foreground">
          {demands.length === 0
            ? "Fila vazia"
            : `${demands.length} demanda${demands.length > 1 ? "s" : ""} aguardando confirmação`}
        </p>
      </div>

      {demands.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma demanda aguardando revisão.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Voltar para a Home</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {demands.map((demand) => (
            <ReviewItem
              key={demand.id}
              demand={{
                id: demand.id,
                category: demand.category?.name ?? null,
                companyId: demand.companyId,
                companyName: demand.company?.name ?? null,
                subject: demand.email?.subject ?? "(sem assunto)",
                preview: demand.email?.preview ?? "",
                senderEmail: demand.email?.senderEmail ?? "",
                senderDomain: demand.email?.senderDomain ?? "",
                receivedAt: demand.email?.receivedAt.toISOString() ?? null,
                webLink: demand.email?.webLink ?? null,
              }}
              companies={companies}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
