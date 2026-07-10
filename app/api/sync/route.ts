import { decryptSecret, encryptSecret, encryptionKeyFromEnv } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { fetchInboxDelta, GraphAuthError, refreshAccessToken } from "@/lib/graph";
import { ingestMessages, type IngestionStore } from "@/lib/sync";

// Execução só via cron com CRON_SECRET — nunca durante render de página.

const store: IngestionStore = {
  async upsertEmail(input) {
    return prisma.email.upsert({
      where: { graphId: input.graphId },
      create: input,
      // Mensagem editada atualiza os metadados; origem (remetente, data) fica.
      update: {
        subject: input.subject,
        preview: input.preview,
        webLink: input.webLink,
      },
      select: { id: true },
    });
  },
  async hasDemandForEmail(emailId) {
    const demand = await prisma.demand.findUnique({
      where: { emailId },
      select: { id: true },
    });
    return demand !== null;
  },
  async createDemand(emailId, demand) {
    await prisma.demand.create({ data: { emailId, ...demand } });
  },
};

async function runSync(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const key = encryptionKeyFromEnv();
  const users = await prisma.user.findMany({
    where: { refreshToken: { not: null } },
  });
  const routes = await prisma.companyDomain.findMany();
  const rules = await prisma.demandRule.findMany({ where: { active: true } });

  const results: Array<Record<string, unknown>> = [];
  for (const user of users) {
    try {
      const tokens = await refreshAccessToken(
        decryptSecret(user.refreshToken as string, key),
      );
      if (tokens.refreshToken) {
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: encryptSecret(tokens.refreshToken, key) },
        });
      }

      const delta = await fetchInboxDelta(tokens.accessToken, user.deltaLink);
      const counts = await ingestMessages(delta.messages, routes, rules, store);
      await prisma.user.update({
        where: { id: user.id },
        data: { deltaLink: delta.deltaLink },
      });
      results.push({ user: user.email, ...counts });
    } catch (error) {
      // Não falha em silêncio: uma conta dessincronizada perde demandas.
      console.error(`[sync] falha para ${user.email}`, error);
      if (error instanceof GraphAuthError) {
        // refreshToken nulo = conta marcada para novo login; a UI lê isso
        // para exibir o banner.
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
        results.push({ user: user.email, error: "reauth_required" });
      } else {
        results.push({
          user: user.email,
          error: error instanceof Error ? error.message : "erro desconhecido",
        });
      }
    }
  }

  return Response.json({ ok: true, results });
}

export async function GET(request: Request) {
  return runSync(request);
}

export async function POST(request: Request) {
  return runSync(request);
}
