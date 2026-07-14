import { describe, expect, it } from "vitest";

import { normalizeCategoryName } from "./category";

describe("normalizeCategoryName", () => {
  it("funde grafias divergentes na mesma categoria", () => {
    expect(normalizeCategoryName("Férias")).toBe("ferias");
    expect(normalizeCategoryName("ferias")).toBe("ferias");
    expect(normalizeCategoryName("FÉRIAS")).toBe("ferias");
  });

  it("espaços viram underscore e bordas são aparadas", () => {
    expect(normalizeCategoryName("  Folha Holerite ")).toBe("folha_holerite");
    expect(normalizeCategoryName("folha   de  pagamento")).toBe(
      "folha_de_pagamento",
    );
  });

  it("remove acentos preservando cedilha como c", () => {
    expect(normalizeCategoryName("Admissão")).toBe("admissao");
    expect(normalizeCategoryName("Rescisão")).toBe("rescisao");
    expect(normalizeCategoryName("Açào")).toBe("acao");
  });

  it("é idempotente: normalizar duas vezes não muda nada", () => {
    const once = normalizeCategoryName("Folha — Impostos");
    expect(normalizeCategoryName(once)).toBe(once);
  });

  it("slug existente passa intocado", () => {
    expect(normalizeCategoryName("folha_impostos")).toBe("folha_impostos");
  });
});
