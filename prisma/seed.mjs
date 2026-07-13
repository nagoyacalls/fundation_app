// Regras iniciais de classificação — ponto de partida, não verdade final:
// o analista ajusta em produção. Categorias conforme docs/prazos.md.
// Folha de pagamento são DUAS categorias porque são dois prazos de natureza
// distinta: uma demanda, um prazo.
import { PrismaClient } from "@prisma/client";

const INITIAL_RULES = [
  { pattern: "admissão", category: "admissao" },
  { pattern: "férias", category: "ferias" },
  { pattern: "rescisão", category: "rescisao" },
  { pattern: "holerite", category: "folha_holerite" },
  { pattern: "imposto", category: "folha_impostos" },
];

const prisma = new PrismaClient();

// Idempotente: rodar de novo não duplica nem sobrescreve ajuste do analista.
for (const rule of INITIAL_RULES) {
  const existing = await prisma.demandRule.findFirst({
    where: { pattern: rule.pattern, category: rule.category },
  });
  if (!existing) {
    await prisma.demandRule.create({ data: rule });
    console.log(`criada: "${rule.pattern}" → ${rule.category}`);
  } else {
    console.log(`já existe: "${rule.pattern}" → ${rule.category}`);
  }
}

await prisma.$disconnect();
