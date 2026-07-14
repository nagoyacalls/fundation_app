// Pipeline de ingestão (docs/sync.md): e-mail novo → routing resolve a
// empresa → classification sugere a categoria → Demand em revisão.
// Nenhum e-mail é descartado; sem empresa, a demanda fica em Não classificado.

import {
  suggestCategory,
  type ClassificationRule,
} from "./classification";
import type { GraphMessage } from "./graph";
import { resolveCompany, type DomainRoute } from "./routing";

export interface EmailInput {
  graphId: string;
  subject: string;
  preview: string;
  senderEmail: string;
  senderDomain: string;
  receivedAt: Date;
  webLink: string;
}

export interface DemandInput {
  companyId: string | null;
  categoryId: string | null;
  classificationConfirmed: false;
}

export function extractDomain(address: string): string {
  const at = address.lastIndexOf("@");
  return at === -1 ? "" : address.slice(at + 1).trim().toLowerCase();
}

/**
 * Nulo = mensagem que não vira e-mail: deleção do delta (a Demand sobrevive
 * à mensagem, então deleção não desfaz nada) ou entrada sem id.
 * Campos ausentes viram vazio em vez de derrubar a mensagem — sem remetente
 * resolvível ela apenas cai em Não classificado.
 */
export function toEmailInput(message: GraphMessage): EmailInput | null {
  if (!message.id || "@removed" in message) {
    return null;
  }
  const senderEmail = message.from?.emailAddress?.address ?? "";
  return {
    graphId: message.id,
    subject: message.subject ?? "",
    preview: message.bodyPreview ?? "",
    senderEmail,
    senderDomain: extractDomain(senderEmail),
    receivedAt: message.receivedDateTime
      ? new Date(message.receivedDateTime)
      : new Date(),
    webLink: message.webLink ?? "",
  };
}

export function buildDemand(
  email: EmailInput,
  routes: readonly DomainRoute[],
  rules: readonly ClassificationRule[],
): DemandInput {
  const routing = resolveCompany(email.senderDomain, routes);
  const suggestion = suggestCategory(
    { subject: email.subject, preview: email.preview },
    rules,
  );
  return {
    companyId: routing.companyId,
    categoryId: suggestion.categoryId,
    // Sempre sugestão: só o analista tira a demanda da fila de revisão.
    classificationConfirmed: false,
  };
}

/**
 * Porta mínima de persistência — permite testar a idempotência da ingestão
 * com Graph mockado e sem banco. A implementação real (Prisma) vive na rota.
 */
export interface IngestionStore {
  upsertEmail(input: EmailInput): Promise<{ id: string }>;
  hasDemandForEmail(emailId: string): Promise<boolean>;
  createDemand(emailId: string, demand: DemandInput): Promise<void>;
}

export interface IngestionCounts {
  created: number;
  skipped: number;
}

/**
 * Idempotente: rodar duas vezes não duplica demanda. O e-mail é upsert por
 * graphId e a demanda só nasce quando o e-mail ainda não tem uma — se a
 * demanda já existe, a mensagem repetida (ou editada) não cria outra.
 */
export async function ingestMessages(
  messages: readonly GraphMessage[],
  routes: readonly DomainRoute[],
  rules: readonly ClassificationRule[],
  store: IngestionStore,
): Promise<IngestionCounts> {
  let created = 0;
  let skipped = 0;
  for (const message of messages) {
    const input = toEmailInput(message);
    if (!input) {
      skipped += 1;
      continue;
    }
    const email = await store.upsertEmail(input);
    if (await store.hasDemandForEmail(email.id)) {
      skipped += 1;
      continue;
    }
    await store.createDemand(email.id, buildDemand(input, routes, rules));
    created += 1;
  }
  return { created, skipped };
}
