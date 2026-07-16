// Dados de demonstração para desenvolvimento local. Idempotente: rodar de
// novo não duplica. NUNCA aponte para um banco de produção.
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Abortado: DATABASE_URL não é local. Este seed é só de demonstração.");
  process.exit(1);
}

const prisma = new PrismaClient();
const day = (offset) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + offset); return d; };

async function company(name, domain) {
  let c = await prisma.company.findFirst({ where: { name } });
  if (!c) c = await prisma.company.create({ data: { name } });
  await prisma.companyDomain.upsert({ where: { domain }, create: { domain, companyId: c.id }, update: {} });
  return c;
}
async function user(email, name) {
  return prisma.user.upsert({ where: { email }, create: { email, name, syncStatus: "ativo" }, update: {} });
}
async function category(name) {
  return prisma.category.upsert({ where: { name }, create: { name }, update: {} });
}
async function demanda({ graphId, subject, preview, company, categoryName, status = "aberta", dueDate = null, confirmed = true, assignee = null, closedAt = null }) {
  const email = await prisma.email.upsert({
    where: { graphId },
    create: {
      graphId, subject, preview,
      senderEmail: `rh@${company ? company.domains?.[0]?.domain ?? "remetente.com.br" : "desconhecida.com.br"}`,
      senderDomain: company ? (await prisma.companyDomain.findFirst({ where: { companyId: company.id } }))?.domain ?? "" : "desconhecida.com.br",
      receivedAt: new Date(), webLink: `https://outlook.office.com/mail/${graphId}`,
    },
    update: {},
  });
  const existing = await prisma.demand.findUnique({ where: { emailId: email.id } });
  if (existing) return existing;
  const cat = categoryName ? await category(categoryName) : null;
  return prisma.demand.create({ data: {
    emailId: email.id, companyId: company?.id ?? null, categoryId: cat?.id ?? null,
    classificationConfirmed: confirmed, status, dueDate,
    assigneeId: assignee?.id ?? null, closedAt,
  }});
}

const acme = await company("Acme Contabilidade", "acme.com.br");
const globex = await company("Globex RH", "globex.com.br");
const ana = await user("ana@dev.local", "Ana Lima");
const bruno = await user("bruno@dev.local", "Bruno Reis");

await demanda({ graphId: "demo-1", subject: "Férias do João — dezembro", preview: "Solicitação de férias do colaborador João.", company: acme, categoryName: "ferias", dueDate: day(-2), assignee: ana });
await demanda({ graphId: "demo-2", subject: "Holerites de julho", preview: "Holerites para conferência e envio.", company: acme, categoryName: "folha_holerite", status: "em_andamento", dueDate: day(1) });
await demanda({ graphId: "demo-3", subject: "Admissão da Carla", preview: "Documentos da nova colaboradora Carla.", company: acme, categoryName: "admissao", dueDate: day(7), assignee: bruno });
await demanda({ graphId: "demo-4", subject: "Rescisão do Pedro", preview: "Iniciar processo de rescisão.", company: globex, categoryName: "rescisao" });
await demanda({ graphId: "demo-5", subject: "DARF de junho", preview: "Guias de impostos da folha.", company: globex, categoryName: "folha_impostos", status: "concluida", dueDate: day(-8), closedAt: new Date() });
await demanda({ graphId: "demo-6", subject: "Férias coletivas — planejamento", preview: "Planejamento das férias coletivas.", company: globex, categoryName: "ferias", status: "concluida", closedAt: new Date(), assignee: ana });
await demanda({ graphId: "demo-7", subject: "Encaminhamento de atestado", preview: "Atestado médico do colaborador.", company: null, categoryName: null, confirmed: false });
await demanda({ graphId: "demo-8", subject: "Dúvida sobre décimo terceiro", preview: "Cliente pergunta sobre adiantamento.", company: acme, categoryName: null, confirmed: false });

console.log("Demonstração pronta: 2 empresas, 2 analistas, 8 demandas (2 na fila de revisão).");
await prisma.$disconnect();
