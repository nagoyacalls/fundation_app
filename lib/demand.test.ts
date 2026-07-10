import { describe, expect, it } from "vitest";

import { nextDemandState } from "./demand";
import type { DemandStatus } from "./validations";

const now = new Date("2026-07-10T12:00:00Z");
const closedBefore = new Date("2026-07-01T09:00:00Z");

function current(status: DemandStatus, closedAt: Date | null = null) {
  return { status, closedAt };
}

describe("nextDemandState", () => {
  it("aberta → em_andamento: sem closedAt", () => {
    expect(nextDemandState(current("aberta"), "em_andamento", now)).toEqual({
      status: "em_andamento",
      closedAt: null,
    });
  });

  it("em_andamento → concluida: grava closedAt = agora", () => {
    expect(nextDemandState(current("em_andamento"), "concluida", now)).toEqual({
      status: "concluida",
      closedAt: now,
    });
  });

  it("aberta → cancelada: grava closedAt = agora", () => {
    expect(nextDemandState(current("aberta"), "cancelada", now)).toEqual({
      status: "cancelada",
      closedAt: now,
    });
  });

  it("reabrir (concluida → em_andamento): closedAt volta a nulo", () => {
    expect(
      nextDemandState(current("concluida", closedBefore), "em_andamento", now),
    ).toEqual({ status: "em_andamento", closedAt: null });
  });

  it("terminal → terminal (concluida → cancelada): preserva o closedAt original", () => {
    expect(
      nextDemandState(current("concluida", closedBefore), "cancelada", now),
    ).toEqual({ status: "cancelada", closedAt: closedBefore });
  });

  it("permanecer em terminal (concluida → concluida): mantém o closedAt", () => {
    expect(
      nextDemandState(current("concluida", closedBefore), "concluida", now),
    ).toEqual({ status: "concluida", closedAt: closedBefore });
  });

  it("nunca produz estado que viole o demandSchema", () => {
    const statuses: DemandStatus[] = [
      "aberta",
      "em_andamento",
      "concluida",
      "cancelada",
    ];
    for (const from of statuses) {
      for (const to of statuses) {
        const patch = nextDemandState(current(from, closedBefore), to, now);
        const terminal = to === "concluida" || to === "cancelada";
        // closedAt preenchido se e só se o status destino é terminal.
        expect(patch.closedAt !== null).toBe(terminal);
      }
    }
  });
});
