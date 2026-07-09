import { describe, expect, it } from "vitest";

import {
  isGenericDomain,
  normalizeDomain,
  resolveCompany,
  type DomainRoute,
} from "./routing";

const routes: DomainRoute[] = [
  { domain: "acme.com.br", companyId: "company-acme" },
  { domain: "globex.com", companyId: "company-globex" },
];

describe("resolveCompany", () => {
  it("resolve domínio conhecido para a empresa", () => {
    expect(resolveCompany("acme.com.br", routes)).toEqual({
      companyId: "company-acme",
      unclassified: false,
    });
  });

  it("retorna não classificado para domínio desconhecido", () => {
    expect(resolveCompany("desconhecida.com.br", routes)).toEqual({
      companyId: null,
      unclassified: true,
    });
  });

  it("ignora maiúsculas e espaços ao redor do domínio", () => {
    expect(resolveCompany("  ACME.com.BR ", routes)).toEqual({
      companyId: "company-acme",
      unclassified: false,
    });
  });

  it("casa mesmo com rota gravada fora do padrão minúsculo", () => {
    const result = resolveCompany("globex.com", [
      { domain: "GLOBEX.com", companyId: "company-globex" },
    ]);
    expect(result.companyId).toBe("company-globex");
  });

  it("não casa subdomínio com o domínio raiz", () => {
    expect(resolveCompany("rh.acme.com.br", routes).unclassified).toBe(true);
  });

  it("retorna não classificado para domínio vazio", () => {
    expect(resolveCompany("", routes).unclassified).toBe(true);
    expect(resolveCompany("   ", routes).unclassified).toBe(true);
  });

  it("retorna não classificado com tabela de rotas vazia", () => {
    expect(resolveCompany("acme.com.br", []).unclassified).toBe(true);
  });

  it("domínio genérico só resolve se houver rota gravada (bloqueio é na escrita)", () => {
    expect(resolveCompany("gmail.com", routes).unclassified).toBe(true);
  });
});

describe("normalizeDomain", () => {
  it("aplica trim e minúsculas", () => {
    expect(normalizeDomain("  ACME.Com.BR ")).toBe("acme.com.br");
  });
});

describe("isGenericDomain", () => {
  it("identifica provedores genéricos, ignorando caixa", () => {
    expect(isGenericDomain("Gmail.COM")).toBe(true);
    expect(isGenericDomain("hotmail.com")).toBe(true);
  });

  it("não marca domínio corporativo como genérico", () => {
    expect(isGenericDomain("acme.com.br")).toBe(false);
  });
});
