import { describe, expect, it } from "vitest";

import type { ClassificationRule } from "./classification";
import type { GraphMessage } from "./graph";
import type { DomainRoute } from "./routing";
import {
  buildDemand,
  extractDomain,
  ingestMessages,
  toEmailInput,
  type DemandInput,
  type EmailInput,
  type IngestionStore,
} from "./sync";

const routes: DomainRoute[] = [
  { domain: "acme.com.br", companyId: "company-acme" },
];

const rules: ClassificationRule[] = [
  {
    id: "rule-ferias",
    pattern: "férias",
    category: "ferias",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  },
];

function graphMessage(overrides: Partial<GraphMessage> = {}): GraphMessage {
  return {
    id: "msg-1",
    subject: "Solicitação de férias",
    bodyPreview: "Segue o pedido…",
    from: { emailAddress: { address: "rh@acme.com.br" } },
    receivedDateTime: "2026-07-09T12:00:00Z",
    webLink: "https://outlook.office.com/mail/id/msg-1",
    ...overrides,
  };
}

/** Store em memória com a mesma semântica de upsert da implementação Prisma. */
function memoryStore() {
  const emails = new Map<string, EmailInput>();
  const demands = new Map<string, DemandInput>();
  const store: IngestionStore = {
    async upsertEmail(input) {
      emails.set(input.graphId, input);
      return { id: `email-${input.graphId}` };
    },
    async hasDemandForEmail(emailId) {
      return demands.has(emailId);
    },
    async createDemand(emailId, demand) {
      demands.set(emailId, demand);
    },
  };
  return { store, emails, demands };
}

describe("extractDomain", () => {
  it("extrai o domínio em minúsculas", () => {
    expect(extractDomain("RH@Acme.Com.BR")).toBe("acme.com.br");
  });

  it("devolve vazio quando não há endereço utilizável", () => {
    expect(extractDomain("")).toBe("");
    expect(extractDomain("sem-arroba")).toBe("");
  });
});

describe("toEmailInput", () => {
  it("mapeia metadados da mensagem do Graph", () => {
    const input = toEmailInput(graphMessage());
    expect(input).toMatchObject({
      graphId: "msg-1",
      subject: "Solicitação de férias",
      preview: "Segue o pedido…",
      senderEmail: "rh@acme.com.br",
      senderDomain: "acme.com.br",
      webLink: "https://outlook.office.com/mail/id/msg-1",
    });
    expect(input?.receivedAt).toEqual(new Date("2026-07-09T12:00:00Z"));
  });

  it("ignora deleções do delta: a demanda sobrevive à mensagem", () => {
    expect(
      toEmailInput({ id: "msg-1", "@removed": { reason: "deleted" } }),
    ).toBeNull();
  });

  it("ignora entrada sem id", () => {
    expect(toEmailInput({ subject: "sem id" })).toBeNull();
  });

  it("mensagem sem remetente ainda é ingerida, com domínio vazio", () => {
    const input = toEmailInput(graphMessage({ from: null }));
    expect(input).toMatchObject({ senderEmail: "", senderDomain: "" });
  });
});

describe("buildDemand", () => {
  it("resolve empresa e sugere categoria, sempre sem confirmação", () => {
    const input = toEmailInput(graphMessage());
    expect(buildDemand(input!, routes, rules)).toEqual({
      companyId: "company-acme",
      category: "ferias",
      classificationConfirmed: false,
    });
  });

  it("domínio desconhecido e nenhuma regra: demanda existe mesmo assim", () => {
    const input = toEmailInput(
      graphMessage({
        from: { emailAddress: { address: "alguem@desconhecida.com" } },
        subject: "Nota fiscal",
        bodyPreview: "Segue anexo",
      }),
    );
    expect(buildDemand(input!, routes, rules)).toEqual({
      companyId: null,
      category: null,
      classificationConfirmed: false,
    });
  });
});

describe("ingestMessages", () => {
  it("cria e-mail e demanda para mensagem nova", async () => {
    const { store, demands } = memoryStore();
    const counts = await ingestMessages([graphMessage()], routes, rules, store);
    expect(counts).toEqual({ created: 1, skipped: 0 });
    expect(demands.get("email-msg-1")).toMatchObject({
      companyId: "company-acme",
      category: "ferias",
      classificationConfirmed: false,
    });
  });

  it("e-mail duplicado: rodar a sync duas vezes não duplica demanda", async () => {
    const { store, demands } = memoryStore();
    await ingestMessages([graphMessage()], routes, rules, store);
    const second = await ingestMessages([graphMessage()], routes, rules, store);
    expect(second).toEqual({ created: 0, skipped: 1 });
    expect(demands.size).toBe(1);
  });

  it("mensagem repetida dentro do mesmo lote também não duplica", async () => {
    const { store, demands } = memoryStore();
    const counts = await ingestMessages(
      [graphMessage(), graphMessage()],
      routes,
      rules,
      store,
    );
    expect(counts).toEqual({ created: 1, skipped: 1 });
    expect(demands.size).toBe(1);
  });

  it("deleções do delta são puladas sem afetar as demais", async () => {
    const { store, demands } = memoryStore();
    const counts = await ingestMessages(
      [
        graphMessage(),
        { id: "msg-2", "@removed": { reason: "deleted" } },
      ],
      routes,
      rules,
      store,
    );
    expect(counts).toEqual({ created: 1, skipped: 1 });
    expect(demands.size).toBe(1);
  });
});
