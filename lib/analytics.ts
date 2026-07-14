// Agregações da analítica (ROADMAP etapa 9). Funções puras: recebem demandas
// CONFIRMADAS (palpite não entra em indicador — CLAUDE.md) e derivam tudo de
// openedAt, closedAt, status e dueDate, nunca de campo persistido.

import { concludedOnTime } from "./deadline";
import type { DemandStatus } from "./validations";

export interface AnalyticsDemand {
  status: DemandStatus;
  openedAt: Date;
  closedAt: Date | null;
  dueDate: Date | null;
  categoryName: string | null;
  assigneeName: string | null;
}

// Mesmo fuso do negócio de lib/deadline.ts: o mês de uma demanda é o mês
// em que o analista a viu chegar, não o do servidor.
const monthFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
});

function monthKey(date: Date): string {
  // en-CA com year+month formata como "YYYY-MM".
  return monthFormat.format(date);
}

/** Últimos `monthsBack` meses, com zero para mês sem demanda — sem buraco no eixo. */
export function volumeByMonth(
  demands: ReadonlyArray<Pick<AnalyticsDemand, "openedAt">>,
  monthsBack: number,
  now: Date,
): Array<{ month: string; total: number }> {
  const [year, month] = monthKey(now).split("-").map(Number);
  const keys: string[] = [];
  for (let back = monthsBack - 1; back >= 0; back--) {
    const d = new Date(Date.UTC(year, month - 1 - back, 1));
    keys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const demand of demands) {
    const key = monthKey(demand.openedAt);
    const current = counts.get(key);
    if (current !== undefined) {
      counts.set(key, current + 1);
    }
  }
  return keys.map((key) => ({ month: key, total: counts.get(key) ?? 0 }));
}

export interface StatusRates {
  total: number;
  concluida: number;
  cancelada: number;
  /** Frações de 0 a 1 sobre o total; 0 quando não há demandas. */
  concluidaRate: number;
  canceladaRate: number;
}

export function statusRates(
  demands: ReadonlyArray<Pick<AnalyticsDemand, "status">>,
): StatusRates {
  const total = demands.length;
  const concluida = demands.filter((d) => d.status === "concluida").length;
  const cancelada = demands.filter((d) => d.status === "cancelada").length;
  return {
    total,
    concluida,
    cancelada,
    concluidaRate: total === 0 ? 0 : concluida / total,
    canceladaRate: total === 0 ? 0 : cancelada / total,
  };
}

/**
 * Tempo médio de atendimento em dias (closedAt − openedAt), só sobre
 * concluídas — cancelada não foi atendida. Nulo quando não há concluídas.
 */
export function averageResolutionDays(
  demands: ReadonlyArray<Pick<AnalyticsDemand, "status" | "openedAt" | "closedAt">>,
): number | null {
  const concluded = demands.filter(
    (d) => d.status === "concluida" && d.closedAt !== null,
  );
  if (concluded.length === 0) {
    return null;
  }
  const totalMs = concluded.reduce(
    (sum, d) => sum + ((d.closedAt as Date).getTime() - d.openedAt.getTime()),
    0,
  );
  return totalMs / concluded.length / 86_400_000;
}

export interface DeadlineCompliance {
  dentro: number;
  fora: number;
  /** Concluídas sem dueDate: a lacuna fica visível, nunca somada aos que estão bem. */
  semPrazo: number;
}

/** Cumprimento de prazo sobre concluídas: dentro vs. fora do dueDate. */
export function deadlineCompliance(
  demands: ReadonlyArray<
    Pick<AnalyticsDemand, "status" | "closedAt" | "dueDate">
  >,
): DeadlineCompliance {
  const result: DeadlineCompliance = { dentro: 0, fora: 0, semPrazo: 0 };
  for (const demand of demands) {
    if (demand.status !== "concluida" || demand.closedAt === null) {
      continue;
    }
    if (demand.dueDate === null) {
      result.semPrazo += 1;
    } else if (concludedOnTime(demand.dueDate, demand.closedAt)) {
      result.dentro += 1;
    } else {
      result.fora += 1;
    }
  }
  return result;
}

/** Contagem por rótulo (categoria, analista), maiores primeiro; nulo vira o fallback. */
export function countByLabel(
  labels: ReadonlyArray<string | null>,
  fallback: string,
): Array<{ label: string; total: number }> {
  const counts = new Map<string, number>();
  for (const label of labels) {
    const key = label ?? fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}
