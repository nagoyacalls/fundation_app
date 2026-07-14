import { describe, expect, it } from "vitest";

import {
  assignDemandSchema,
  changeDemandStatusSchema,
  companyDomainSchema,
  confirmClassificationSchema,
  demandRuleSchema,
  demandSchema,
  emailSchema,
  setDueDateSchema,
} from "./validations";

describe("companyDomainSchema", () => {
  it("aceita domínio corporativo e normaliza para minúsculas", () => {
    const result = companyDomainSchema.parse({
      domain: "  ACME.com.BR ",
      companyId: "company-acme",
    });
    expect(result.domain).toBe("acme.com.br");
  });

  it("bloqueia domínio genérico na escrita", () => {
    const result = companyDomainSchema.safeParse({
      domain: "gmail.com",
      companyId: "company-acme",
    });
    expect(result.success).toBe(false);
  });

  it("bloqueia domínio genérico mesmo com caixa diferente", () => {
    const result = companyDomainSchema.safeParse({
      domain: "Hotmail.COM",
      companyId: "company-acme",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita valor que não tem forma de domínio", () => {
    expect(
      companyDomainSchema.safeParse({ domain: "não é domínio", companyId: "c" })
        .success,
    ).toBe(false);
    expect(
      companyDomainSchema.safeParse({ domain: "semponto", companyId: "c" })
        .success,
    ).toBe(false);
  });
});

describe("demandRuleSchema", () => {
  it("aplica active = true por padrão", () => {
    const result = demandRuleSchema.parse({
      pattern: "férias",
      category: "ferias",
    });
    expect(result.active).toBe(true);
  });

  it("rejeita pattern vazio ou só espaços", () => {
    expect(
      demandRuleSchema.safeParse({ pattern: "   ", category: "ferias" }).success,
    ).toBe(false);
  });
});

describe("emailSchema", () => {
  const valid = {
    graphId: "AAMk123",
    subject: "Solicitação de férias",
    preview: "Segue o pedido…",
    senderEmail: "rh@acme.com.br",
    senderDomain: "acme.com.br",
    receivedAt: "2026-07-09T12:00:00Z",
    webLink: "https://outlook.office.com/mail/id/AAMk123",
  };

  it("aceita metadados válidos e coage a data", () => {
    const result = emailSchema.parse(valid);
    expect(result.receivedAt).toBeInstanceOf(Date);
  });

  it("aceita assunto e preview vazios", () => {
    expect(
      emailSchema.safeParse({ ...valid, subject: "", preview: "" }).success,
    ).toBe(true);
  });

  it("rejeita webLink que não é URL", () => {
    expect(emailSchema.safeParse({ ...valid, webLink: "abrir" }).success).toBe(
      false,
    );
  });
});

describe("confirmClassificationSchema", () => {
  it("aceita confirmação com empresa existente", () => {
    expect(
      confirmClassificationSchema.safeParse({
        demandId: "demand-1",
        companyId: "company-1",
        category: "ferias",
      }).success,
    ).toBe(true);
  });

  it("aceita confirmação criando empresa nova", () => {
    expect(
      confirmClassificationSchema.safeParse({
        demandId: "demand-1",
        newCompanyName: "Acme Contabilidade",
        category: "ferias",
      }).success,
    ).toBe(true);
  });

  it("rejeita sem nenhuma fonte de empresa", () => {
    expect(
      confirmClassificationSchema.safeParse({
        demandId: "demand-1",
        category: "ferias",
      }).success,
    ).toBe(false);
  });

  it("rejeita com as duas fontes de empresa ao mesmo tempo", () => {
    expect(
      confirmClassificationSchema.safeParse({
        demandId: "demand-1",
        companyId: "company-1",
        newCompanyName: "Outra",
        category: "ferias",
      }).success,
    ).toBe(false);
  });

  it("rejeita categoria vazia", () => {
    expect(
      confirmClassificationSchema.safeParse({
        demandId: "demand-1",
        companyId: "company-1",
        category: "   ",
      }).success,
    ).toBe(false);
  });
});

describe("changeDemandStatusSchema", () => {
  it("aceita status válido", () => {
    expect(
      changeDemandStatusSchema.safeParse({ demandId: "d1", status: "concluida" })
        .success,
    ).toBe(true);
  });

  it("rejeita status fora do ciclo", () => {
    expect(
      changeDemandStatusSchema.safeParse({ demandId: "d1", status: "pausada" })
        .success,
    ).toBe(false);
  });
});

describe("assignDemandSchema", () => {
  it("aceita atribuição a um analista", () => {
    const result = assignDemandSchema.parse({
      demandId: "d1",
      assigneeId: "user-1",
    });
    expect(result.assigneeId).toBe("user-1");
  });

  it("string vazia remove a atribuição (vira null)", () => {
    const result = assignDemandSchema.parse({ demandId: "d1", assigneeId: "" });
    expect(result.assigneeId).toBeNull();
  });
});

describe("setDueDateSchema", () => {
  it("converte YYYY-MM-DD em data pura à meia-noite UTC", () => {
    const result = setDueDateSchema.parse({
      demandId: "d1",
      dueDate: "2026-07-20",
    });
    expect(result.dueDate).toEqual(new Date("2026-07-20T00:00:00Z"));
  });

  it("string vazia limpa o prazo (vira null)", () => {
    const result = setDueDateSchema.parse({ demandId: "d1", dueDate: "" });
    expect(result.dueDate).toBeNull();
  });

  it("rejeita formato inválido", () => {
    expect(
      setDueDateSchema.safeParse({ demandId: "d1", dueDate: "20/07/2026" })
        .success,
    ).toBe(false);
  });

  it("rejeita data inexistente no calendário", () => {
    expect(
      setDueDateSchema.safeParse({ demandId: "d1", dueDate: "2026-02-31" })
        .success,
    ).toBe(false);
  });
});

describe("demandSchema", () => {
  it("nasce não classificada por padrão", () => {
    const result = demandSchema.parse({});
    expect(result).toMatchObject({
      companyId: null,
      category: null,
      classificationConfirmed: false,
      status: "aberta",
      closedAt: null,
    });
  });

  it("rejeita closedAt sem status terminal", () => {
    const result = demandSchema.safeParse({
      status: "em_andamento",
      closedAt: "2026-07-09T12:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("aceita closedAt com status terminal", () => {
    expect(
      demandSchema.safeParse({
        status: "concluida",
        closedAt: "2026-07-09T12:00:00Z",
      }).success,
    ).toBe(true);
    expect(
      demandSchema.safeParse({
        status: "cancelada",
        closedAt: "2026-07-09T12:00:00Z",
      }).success,
    ).toBe(true);
  });
});
