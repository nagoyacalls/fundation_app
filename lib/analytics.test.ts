import { describe, expect, it } from "vitest";

import {
  averageResolutionDays,
  countByLabel,
  deadlineCompliance,
  statusRates,
  volumeByMonth,
} from "./analytics";
import { concludedOnTime } from "./deadline";

const now = new Date("2026-07-10T15:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("volumeByMonth", () => {
  it("agrupa por mês de abertura, com zero nos meses vazios", () => {
    const result = volumeByMonth(
      [
        { openedAt: new Date("2026-07-01T12:00:00Z") },
        { openedAt: new Date("2026-07-09T12:00:00Z") },
        { openedAt: new Date("2026-05-20T12:00:00Z") },
        { openedAt: new Date("2025-12-20T12:00:00Z") }, // fora da janela
      ],
      3,
      now,
    );
    expect(result).toEqual([
      { month: "2026-05", total: 1 },
      { month: "2026-06", total: 0 },
      { month: "2026-07", total: 2 },
    ]);
  });

  it("usa o mês de Brasília, não o do servidor em UTC", () => {
    // 01:00Z de 1º de julho ainda é 30 de junho em Brasília.
    const result = volumeByMonth(
      [{ openedAt: new Date("2026-07-01T01:00:00Z") }],
      2,
      now,
    );
    expect(result).toEqual([
      { month: "2026-06", total: 1 },
      { month: "2026-07", total: 0 },
    ]);
  });
});

describe("statusRates", () => {
  it("calcula taxas de conclusão e cancelamento sobre o total", () => {
    const rates = statusRates([
      { status: "concluida" },
      { status: "concluida" },
      { status: "cancelada" },
      { status: "aberta" },
    ]);
    expect(rates).toEqual({
      total: 4,
      concluida: 2,
      cancelada: 1,
      concluidaRate: 0.5,
      canceladaRate: 0.25,
    });
  });

  it("carteira vazia: taxas zero, sem divisão por zero", () => {
    expect(statusRates([])).toEqual({
      total: 0,
      concluida: 0,
      cancelada: 0,
      concluidaRate: 0,
      canceladaRate: 0,
    });
  });
});

describe("averageResolutionDays", () => {
  it("média de closedAt − openedAt só das concluídas", () => {
    const result = averageResolutionDays([
      {
        status: "concluida",
        openedAt: new Date("2026-07-01T00:00:00Z"),
        closedAt: new Date("2026-07-03T00:00:00Z"), // 2 dias
      },
      {
        status: "concluida",
        openedAt: new Date("2026-07-01T00:00:00Z"),
        closedAt: new Date("2026-07-05T00:00:00Z"), // 4 dias
      },
      {
        status: "cancelada",
        openedAt: new Date("2026-07-01T00:00:00Z"),
        closedAt: new Date("2026-07-30T00:00:00Z"), // fora: não é atendimento
      },
      { status: "aberta", openedAt: new Date("2026-07-01T00:00:00Z"), closedAt: null },
    ]);
    expect(result).toBe(3);
  });

  it("nulo quando não há concluídas — média de nada não é zero", () => {
    expect(averageResolutionDays([])).toBeNull();
    expect(
      averageResolutionDays([
        { status: "aberta", openedAt: now, closedAt: null },
      ]),
    ).toBeNull();
  });
});

describe("deadlineCompliance", () => {
  it("separa dentro, fora e sem prazo, só sobre concluídas", () => {
    const result = deadlineCompliance([
      // concluída no dia do prazo: dentro
      { status: "concluida", dueDate: day("2026-07-05"), closedAt: new Date("2026-07-05T18:00:00Z") },
      // concluída antes do prazo: dentro
      { status: "concluida", dueDate: day("2026-07-05"), closedAt: new Date("2026-07-01T12:00:00Z") },
      // concluída depois do prazo: fora
      { status: "concluida", dueDate: day("2026-07-05"), closedAt: new Date("2026-07-08T12:00:00Z") },
      // concluída sem prazo: lacuna visível
      { status: "concluida", dueDate: null, closedAt: new Date("2026-07-08T12:00:00Z") },
      // cancelada e aberta ficam fora
      { status: "cancelada", dueDate: day("2026-07-05"), closedAt: new Date("2026-07-08T12:00:00Z") },
      { status: "aberta", dueDate: day("2026-07-05"), closedAt: null },
    ]);
    expect(result).toEqual({ dentro: 2, fora: 1, semPrazo: 1 });
  });
});

describe("concludedOnTime", () => {
  it("conclusão na noite do dia do prazo (fuso de Brasília) ainda é no prazo", () => {
    // 01:00Z do dia 6 = 22:00 do dia 5 em Brasília: dentro.
    expect(concludedOnTime(day("2026-07-05"), new Date("2026-07-06T01:00:00Z"))).toBe(true);
    // 12:00Z do dia 6 já é dia 6 em Brasília: fora.
    expect(concludedOnTime(day("2026-07-05"), new Date("2026-07-06T12:00:00Z"))).toBe(false);
  });
});

describe("countByLabel", () => {
  it("conta por rótulo, maiores primeiro, nulo vira fallback", () => {
    expect(
      countByLabel(["ferias", "ferias", null, "rescisao"], "sem categoria"),
    ).toEqual([
      { label: "ferias", total: 2 },
      { label: "rescisao", total: 1 },
      { label: "sem categoria", total: 1 },
    ]);
  });

  it("empate desempata por rótulo, alfabético", () => {
    expect(countByLabel(["b", "a"], "x")).toEqual([
      { label: "a", total: 1 },
      { label: "b", total: 1 },
    ]);
  });
});
