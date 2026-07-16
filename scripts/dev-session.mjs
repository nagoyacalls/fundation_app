// Login de DESENVOLVIMENTO: cria um analista local e imprime o cookie de
// sessão. Guarda dupla: só funciona com banco local e nunca deve existir em
// produção — em produção o login é o Entra ID, e ponto.
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Abortado: DATABASE_URL não é local. dev-session é só para desenvolvimento.");
  process.exit(1);
}
if (!process.env.AUTH_SECRET) {
  console.error("AUTH_SECRET ausente no .env — gere um antes (veja README).");
  process.exit(1);
}

const email = process.argv[2] ?? "ana@dev.local";
const prisma = new PrismaClient();
const user = await prisma.user.upsert({
  where: { email },
  create: { email, name: "Analista Dev", syncStatus: "ativo" },
  update: {},
});
const token = await encode({
  token: { sub: user.id, userId: user.id, name: user.name, email: user.email },
  secret: process.env.AUTH_SECRET,
  salt: "authjs.session-token",
  maxAge: 60 * 60 * 24,
});
console.log(`\nSessão de desenvolvimento para ${user.email} (válida por 24h).\n`);
console.log("1. Abra http://localhost:3000/login no navegador");
console.log("2. Abra o console do navegador (F12 → Console) e cole:\n");
console.log(`document.cookie = "authjs.session-token=${token}; path=/";location.href="/";\n`);
await prisma.$disconnect();
