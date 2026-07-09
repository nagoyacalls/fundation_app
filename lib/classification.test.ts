import { describe, expect, it } from "vitest";

import {
  suggestCategory,
  type ClassificationRule,
} from "./classification";

function rule(overrides: Partial<ClassificationRule>): ClassificationRule {
  return {
    id: "rule-1",
    pattern: "férias",
    category: "ferias",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("suggestCategory", () => {
  it("sugere a categoria quando uma regra casa no assunto", () => {
    const result = suggestCategory(
      { subject: "Solicitação de férias", preview: "Segue o pedido." },
      [rule({})],
    );
    expect(result).toEqual({ category: "ferias", matchedRuleIds: ["rule-1"] });
  });

  it("casa também no preview, não só no assunto", () => {
    const result = suggestCategory(
      { subject: "Urgente", preview: "Precisamos falar sobre a rescisão do João." },
      [rule({ id: "rule-resc", pattern: "rescisão", category: "rescisao" })],
    );
    expect(result.category).toBe("rescisao");
  });

  it("é case-insensitive dos dois lados", () => {
    const result = suggestCategory(
      { subject: "SOLICITAÇÃO DE FÉRIAS", preview: "" },
      [rule({ pattern: "Férias" })],
    );
    expect(result.category).toBe("ferias");
  });

  it("retorna sem categoria quando nenhuma regra casa", () => {
    const result = suggestCategory(
      { subject: "Nota fiscal de serviço", preview: "Segue anexo." },
      [rule({})],
    );
    expect(result).toEqual({ category: null, matchedRuleIds: [] });
  });

  it("retorna sem categoria quando não há regras", () => {
    const result = suggestCategory(
      { subject: "Solicitação de férias", preview: "" },
      [],
    );
    expect(result).toEqual({ category: null, matchedRuleIds: [] });
  });

  it("com múltiplas regras casando, sugere a criada primeiro e lista todas", () => {
    const rules = [
      rule({
        id: "rule-nova",
        pattern: "férias",
        category: "ferias-vendidas",
        createdAt: new Date("2026-03-01T00:00:00Z"),
      }),
      rule({
        id: "rule-antiga",
        pattern: "solicitação",
        category: "solicitacao-geral",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ];
    const result = suggestCategory(
      { subject: "Solicitação de férias", preview: "" },
      rules,
    );
    expect(result.category).toBe("solicitacao-geral");
    expect(result.matchedRuleIds).toEqual(["rule-antiga", "rule-nova"]);
  });

  it("desempata regras criadas no mesmo instante pelo id", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const rules = [
      rule({ id: "rule-b", pattern: "férias", category: "categoria-b", createdAt }),
      rule({ id: "rule-a", pattern: "férias", category: "categoria-a", createdAt }),
    ];
    const result = suggestCategory(
      { subject: "Férias", preview: "" },
      rules,
    );
    expect(result.category).toBe("categoria-a");
  });

  it("ignora regras inativas", () => {
    const result = suggestCategory(
      { subject: "Solicitação de férias", preview: "" },
      [rule({ active: false })],
    );
    expect(result).toEqual({ category: null, matchedRuleIds: [] });
  });

  it("ignora pattern vazio ou só espaços em vez de casar tudo", () => {
    const result = suggestCategory(
      { subject: "Qualquer assunto", preview: "Qualquer preview" },
      [rule({ pattern: "   " })],
    );
    expect(result).toEqual({ category: null, matchedRuleIds: [] });
  });
});
