import { describe, expect, it } from "vitest";

import { deadlineCounts, deadlineState } from "./deadline";

// Meio-dia em Brasília (15:00Z): dia corrente = 2026-07-10 nos dois fusos.
const now = new Date("2026-07-10T15:00:00Z");

// dueDate como sai do banco (@db.Date): meia-noite UTC do dia digitado.
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("deadlineState", () => {
  it("sem_prazo quando dueDate é nulo", () => {
    expect(deadlineState(null, "aberta", now)).toBe("sem_prazo");
    expect(deadlineState(null, "em_andamento", now)).toBe("sem_prazo");
  });

  it("no_prazo quando vence em mais de 1 dia", () => {
    expect(deadlineState(day("2026-07-12"), "aberta", now)).toBe("no_prazo");
    expect(deadlineState(day("2026-08-01"), "aberta", now)).toBe("no_prazo");
  });

  it("vencendo quando vence hoje", () => {
    expect(deadlineState(day("2026-07-10"), "aberta", now)).toBe("vencendo");
  });

  it("vencendo quando vence amanhã (fronteira)", () => {
    expect(deadlineState(day("2026-07-11"), "em_andamento", now)).toBe(
      "vencendo",
    );
  });

  it("depois de amanhã já é no_prazo (fronteira do 'mais de 1 dia')", () => {
    expect(deadlineState(day("2026-07-12"), "aberta", now)).toBe("no_prazo");
  });

  it("atrasada quando o prazo passou e o status não é terminal", () => {
    expect(deadlineState(day("2026-07-09"), "aberta", now)).toBe("atrasada");
    expect(deadlineState(day("2026-06-01"), "em_andamento", now)).toBe(
      "atrasada",
    );
  });

  it("status terminal nunca é atrasada nem vencendo, mesmo com prazo vencido", () => {
    expect(deadlineState(day("2026-07-09"), "concluida", now)).toBe("no_prazo");
    expect(deadlineState(day("2026-07-09"), "cancelada", now)).toBe("no_prazo");
    expect(deadlineState(day("2026-07-10"), "concluida", now)).toBe("no_prazo");
  });

  it("status terminal sem prazo continua sem_prazo, nunca no_prazo", () => {
    expect(deadlineState(null, "concluida", now)).toBe("sem_prazo");
    expect(deadlineState(null, "cancelada", now)).toBe("sem_prazo");
  });

  it("contadores: terminal fica fora de tudo; sem_prazo nunca soma no que está bem", () => {
    const counts = deadlineCounts(
      [
        { dueDate: day("2026-07-09"), status: "aberta" }, // atrasada
        { dueDate: day("2026-07-10"), status: "em_andamento" }, // vencendo (hoje)
        { dueDate: day("2026-07-11"), status: "aberta" }, // vencendo (amanhã)
        { dueDate: day("2026-08-01"), status: "aberta" }, // no_prazo
        { dueDate: null, status: "aberta" }, // sem prazo
        { dueDate: day("2026-07-01"), status: "concluida" }, // terminal: fora
        { dueDate: null, status: "cancelada" }, // terminal: fora
      ],
      now,
    );
    expect(counts).toEqual({
      emAberto: 5,
      vencendo: 2,
      atrasada: 1,
      semPrazo: 1,
    });
  });

  it("contadores zerados para carteira vazia ou só terminais", () => {
    expect(deadlineCounts([], now)).toEqual({
      emAberto: 0,
      vencendo: 0,
      atrasada: 0,
      semPrazo: 0,
    });
    expect(
      deadlineCounts([{ dueDate: day("2026-07-01"), status: "concluida" }], now),
    ).toEqual({ emAberto: 0, vencendo: 0, atrasada: 0, semPrazo: 0 });
  });

  it("'hoje' é o dia de Brasília, não o do servidor em UTC", () => {
    // 01:00Z do dia 11 ainda é 22:00 do dia 10 em Brasília: a demanda que
    // vence dia 10 está vencendo, não atrasada.
    const lateEvening = new Date("2026-07-11T01:00:00Z");
    expect(deadlineState(day("2026-07-10"), "aberta", lateEvening)).toBe(
      "vencendo",
    );
    // Na virada do dia em Brasília (03:00Z), aí sim fica atrasada.
    const afterMidnight = new Date("2026-07-11T03:00:00Z");
    expect(deadlineState(day("2026-07-10"), "aberta", afterMidnight)).toBe(
      "atrasada",
    );
  });
});
