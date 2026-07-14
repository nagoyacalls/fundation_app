// Estados de prazo (docs/prazos.md). Derivados, nunca persistidos: função
// pura sobre dueDate, status e a data corrente. O sistema não infere prazo,
// não conta dias úteis e não conhece feriados — o analista digita a data.

import { TERMINAL_DEMAND_STATUSES, type DemandStatus } from "./validations";

export interface DeadlineCounts {
  /** Demandas com status não terminal. */
  emAberto: number;
  vencendo: number;
  atrasada: number;
  /** Não terminais sem data — a lacuna fica visível, nunca somada ao que está bem. */
  semPrazo: number;
}

export type DeadlineState = "sem_prazo" | "no_prazo" | "vencendo" | "atrasada";

export const DEADLINE_STATES: readonly DeadlineState[] = [
  "sem_prazo",
  "no_prazo",
  "vencendo",
  "atrasada",
];

// "Hoje" é o dia corrente dos analistas, não o do servidor: um deploy em UTC
// marcaria atraso às 21h de Brasília. Fixo, para o resultado não depender do
// fuso da máquina.
const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

const MS_PER_DAY = 86_400_000;

// en-CA formata como YYYY-MM-DD, parseável direto como UTC.
const businessDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia corrente no fuso do negócio, em dias desde a época. */
function businessDayNumber(now: Date): number {
  return Date.parse(`${businessDayFormat.format(now)}T00:00:00Z`) / MS_PER_DAY;
}

/** dueDate é data pura (@db.Date, meia-noite UTC): o dia é o próprio dia UTC. */
function dueDayNumber(dueDate: Date): number {
  return Math.floor(dueDate.getTime() / MS_PER_DAY);
}

/**
 * | Estado      | Condição                                        |
 * |-------------|--------------------------------------------------|
 * | sem_prazo   | dueDate nulo                                      |
 * | no_prazo    | vence em mais de 1 dia                            |
 * | vencendo    | vence hoje ou amanhã                              |
 * | atrasada    | dueDate passou e status não é terminal            |
 *
 * Status terminal nunca é vencendo nem atrasada — foi entregue, o prazo
 * deixou de correr — então recai em no_prazo (sem destaque) quando há data.
 * sem_prazo nunca conta como no_prazo: são estados distintos.
 */
export function deadlineState(
  dueDate: Date | null,
  status: DemandStatus,
  now: Date,
): DeadlineState {
  if (dueDate === null) {
    return "sem_prazo";
  }
  if (TERMINAL_DEMAND_STATUSES.has(status)) {
    return "no_prazo";
  }

  const daysUntilDue = dueDayNumber(dueDate) - businessDayNumber(now);
  if (daysUntilDue < 0) {
    return "atrasada";
  }
  if (daysUntilDue <= 1) {
    return "vencendo";
  }
  return "no_prazo";
}

/**
 * Contadores de painel. Status terminal fica fora de TODAS as contagens —
 * o prazo deixou de correr — e sem_prazo é contado à parte, nunca somado.
 * O chamador passa apenas demandas confirmadas: palpite não entra em
 * indicador (invariante do CLAUDE.md).
 */
export function deadlineCounts(
  demands: ReadonlyArray<{ dueDate: Date | null; status: DemandStatus }>,
  now: Date,
): DeadlineCounts {
  const counts: DeadlineCounts = {
    emAberto: 0,
    vencendo: 0,
    atrasada: 0,
    semPrazo: 0,
  };
  for (const demand of demands) {
    if (TERMINAL_DEMAND_STATUSES.has(demand.status)) {
      continue;
    }
    counts.emAberto += 1;
    const state = deadlineState(demand.dueDate, demand.status, now);
    if (state === "vencendo") {
      counts.vencendo += 1;
    } else if (state === "atrasada") {
      counts.atrasada += 1;
    } else if (state === "sem_prazo") {
      counts.semPrazo += 1;
    }
  }
  return counts;
}
