// Ciclo de vida da demanda (docs/dominio.md). ESTE é o único caminho
// autorizado a mudar `status` e gravar `closedAt`. Regra que depende de
// alguém lembrar de chamá-la não é regra — por isso o cálculo do estado é
// uma função pura, validada pelo demandSchema, e a escrita passa só por aqui.

import { prisma } from "./db";
import {
  demandSchema,
  TERMINAL_DEMAND_STATUSES,
  type DemandStatus,
} from "./validations";

export interface DemandStatePatch {
  status: DemandStatus;
  closedAt: Date | null;
}

/**
 * Calcula status e closedAt de uma transição:
 * - entra em terminal (concluida | cancelada) → grava closedAt = agora;
 * - já era terminal e continua terminal → preserva o closedAt original;
 * - sai de terminal para não-terminal → closedAt volta a nulo.
 *
 * O resultado passa pelo demandSchema: o invariante "closedAt só com status
 * terminal" deixa de ser teste inerte e vira barreira de runtime.
 */
export function nextDemandState(
  current: { status: DemandStatus; closedAt: Date | null },
  nextStatus: DemandStatus,
  now: Date,
): DemandStatePatch {
  const nextIsTerminal = TERMINAL_DEMAND_STATUSES.has(nextStatus);
  const currentIsTerminal = TERMINAL_DEMAND_STATUSES.has(current.status);

  let closedAt: Date | null;
  if (!nextIsTerminal) {
    closedAt = null;
  } else if (currentIsTerminal) {
    closedAt = current.closedAt;
  } else {
    closedAt = now;
  }

  const parsed = demandSchema.parse({ status: nextStatus, closedAt });
  return { status: parsed.status, closedAt: parsed.closedAt };
}

export type ChangeStatusResult =
  | { ok: true; data: DemandStatePatch }
  | { ok: false; error: string };

/**
 * Aplica a transição no banco. Único ponto que escreve status/closedAt da
 * demanda; qualquer Server Action de mudança de status chama por aqui.
 */
export async function changeDemandStatus(
  demandId: string,
  nextStatus: DemandStatus,
): Promise<ChangeStatusResult> {
  const current = await prisma.demand.findUnique({
    where: { id: demandId },
    select: { status: true, closedAt: true },
  });
  if (!current) {
    return { ok: false, error: "Demanda não encontrada" };
  }

  const patch = nextDemandState(current, nextStatus, new Date());
  await prisma.demand.update({ where: { id: demandId }, data: patch });
  return { ok: true, data: patch };
}
