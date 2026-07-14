"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  companyDomainSchema,
  confirmClassificationSchema,
} from "@/lib/validations";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function confirmClassification(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }

  const parsed = confirmClassificationSchema.safeParse({
    demandId: formData.get("demandId"),
    // FormData manda "" para campo vazio; o schema espera ausência.
    companyId: formData.get("companyId") || undefined,
    newCompanyName: formData.get("newCompanyName") || undefined,
    category: formData.get("category"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }
  const input = parsed.data;

  const demand = await prisma.demand.findUnique({
    where: { id: input.demandId },
    include: { email: { select: { senderDomain: true } } },
  });
  if (!demand) {
    return { ok: false, error: "Demanda não encontrada" };
  }
  if (demand.classificationConfirmed) {
    // Confirmação repetida (duplo clique, duas abas): nada a fazer.
    revalidatePath("/revisao");
    return { ok: true };
  }

  await prisma.$transaction(async (tx) => {
    const companyId =
      input.companyId ??
      (await tx.company.create({ data: { name: input.newCompanyName as string } }))
        .id;

    // input.category já vem normalizado pelo schema; o nome único da tabela
    // garante que grafias divergentes caem na MESMA categoria.
    const category = await tx.category.upsert({
      where: { name: input.category },
      create: { name: input.category },
      update: {},
    });

    await tx.demand.update({
      where: { id: demand.id },
      data: {
        companyId,
        categoryId: category.id,
        classificationConfirmed: true,
      },
    });

    // Atribuição manual grava a rota de domínio para o mesmo remetente
    // resolver sozinho na próxima (docs/dominio.md). O schema barra domínio
    // genérico ou inválido; rota já existente não é roubada.
    const route = companyDomainSchema.safeParse({
      domain: demand.email?.senderDomain ?? "",
      companyId,
    });
    if (route.success) {
      await tx.companyDomain.upsert({
        where: { domain: route.data.domain },
        create: route.data,
        update: {},
      });
    }
  });

  revalidatePath("/revisao");
  return { ok: true };
}
