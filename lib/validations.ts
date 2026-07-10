// Schemas Zod das escritas. Toda Server Action valida a entrada por aqui.

import { z } from "zod";

import { isGenericDomain, normalizeDomain } from "./routing";

const requiredText = z.string().trim().min(1, "Obrigatório");

// Forma mínima de domínio: rótulos alfanuméricos (com hífen) e pelo menos um ponto.
const DOMAIN_SHAPE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export const userSchema = z.object({
  email: z.email(),
  name: requiredText,
});

export const companySchema = z.object({
  name: requiredText,
});

/**
 * Escrita de rota de domínio — inclusive a gravação automática quando o
 * analista atribui empresa a uma demanda não classificada. Domínio genérico
 * (gmail etc.) nunca vira regra: o bloqueio é aqui, na escrita, não na leitura.
 */
export const companyDomainSchema = z.object({
  domain: z
    .string()
    .transform(normalizeDomain)
    .pipe(z.string().regex(DOMAIN_SHAPE, "Domínio inválido"))
    .refine((domain) => !isGenericDomain(domain), {
      message: "Domínio genérico de provedor não identifica uma empresa",
    }),
  companyId: requiredText,
});

export const demandRuleSchema = z.object({
  pattern: requiredText,
  category: requiredText,
  active: z.boolean().default(true),
});

export const emailSchema = z.object({
  graphId: requiredText,
  // Assunto e preview podem vir vazios do Outlook; só metadados, nunca o corpo.
  subject: z.string(),
  preview: z.string(),
  senderEmail: z.email(),
  senderDomain: z
    .string()
    .transform(normalizeDomain)
    .pipe(z.string().regex(DOMAIN_SHAPE, "Domínio inválido")),
  receivedAt: z.coerce.date(),
  webLink: z.url(),
});

export const demandStatusSchema = z.enum([
  "aberta",
  "em_andamento",
  "concluida",
  "cancelada",
]);

export type DemandStatus = z.infer<typeof demandStatusSchema>;

export const TERMINAL_DEMAND_STATUSES: ReadonlySet<DemandStatus> = new Set([
  "concluida",
  "cancelada",
] as const);

/**
 * Confirmação na fila de revisão: o analista fixa empresa e categoria.
 * Empresa vem de exatamente uma fonte — uma existente (companyId) ou uma
 * nova pelo nome. FormData manda "" para campo vazio; normalizamos antes.
 */
export const confirmClassificationSchema = z
  .object({
    demandId: requiredText,
    companyId: requiredText.optional(),
    newCompanyName: requiredText.optional(),
    category: requiredText,
  })
  .refine(
    (input) =>
      (input.companyId === undefined) !== (input.newCompanyName === undefined),
    {
      message: "Escolha uma empresa existente ou informe o nome de uma nova",
      path: ["companyId"],
    },
  );

export const demandSchema = z
  .object({
    // Nulos = não classificado; a demanda existe mesmo sem empresa.
    companyId: requiredText.nullable().default(null),
    emailId: requiredText.nullable().default(null),
    category: requiredText.nullable().default(null),
    classificationConfirmed: z.boolean().default(false),
    status: demandStatusSchema.default("aberta"),
    assigneeId: requiredText.nullable().default(null),
    closedAt: z.coerce.date().nullable().default(null),
  })
  .refine(
    (demand) =>
      demand.closedAt === null || TERMINAL_DEMAND_STATUSES.has(demand.status),
    {
      message: "closedAt só pode ser preenchido com status terminal",
      path: ["closedAt"],
    },
  );
