"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { changeDemandStatus } from "@/lib/demand";
import {
  assignDemandSchema,
  changeDemandStatusSchema,
  setDueDateSchema,
} from "@/lib/validations";

export type ActionResult = { ok: true } | { ok: false; error: string };

// A linha de demanda aparece na lista global e na página da empresa;
// as duas precisam refletir a escrita.
function revalidateDemandViews() {
  revalidatePath("/demandas");
  revalidatePath("/empresas/[id]", "page");
}

async function requireSession(): Promise<ActionResult | null> {
  const session = await auth();
  return session?.user ? null : { ok: false, error: "Sessão expirada. Entre novamente." };
}

export async function updateDemandStatus(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireSession();
  if (denied) {
    return denied;
  }

  const parsed = changeDemandStatusSchema.safeParse({
    demandId: formData.get("demandId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // Único caminho autorizado a gravar status/closedAt (docs/dominio.md).
  const result = await changeDemandStatus(parsed.data.demandId, parsed.data.status);
  if (!result.ok) {
    return result;
  }
  revalidateDemandViews();
  return { ok: true };
}

export async function assignDemand(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireSession();
  if (denied) {
    return denied;
  }

  const parsed = assignDemandSchema.safeParse({
    demandId: formData.get("demandId"),
    assigneeId: formData.get("assigneeId"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  try {
    await prisma.demand.update({
      where: { id: parsed.data.demandId },
      data: { assigneeId: parsed.data.assigneeId },
    });
  } catch {
    return { ok: false, error: "Demanda ou analista não encontrado" };
  }
  revalidateDemandViews();
  return { ok: true };
}

export async function setDueDate(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireSession();
  if (denied) {
    return denied;
  }

  const parsed = setDueDateSchema.safeParse({
    demandId: formData.get("demandId"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  try {
    await prisma.demand.update({
      where: { id: parsed.data.demandId },
      data: { dueDate: parsed.data.dueDate },
    });
  } catch {
    return { ok: false, error: "Demanda não encontrada" };
  }
  revalidateDemandViews();
  return { ok: true };
}
