import { decryptSecret, encryptSecret, encryptionKeyFromEnv } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { fetchInboxDelta, GraphAuthError, refreshAccessToken } from "@/lib/graph";
import { ingestMessages, type IngestionStore } from "@/lib/sync";
import {
  afterAuthFailure,
  afterSyncSuccess,
  afterTransientFailure,
  SYNCABLE_STATUSES,
} from "@/lib/sync-status";

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
  // Seleção pelo syncStatus, nunca pelo refreshToken (docs/sync.md).
  const users = await prisma.user.findMany({
    where: { syncStatus: { in: [...SYNCABLE_STATUSES] } },
  });
  const routes = await prisma.companyDomain.findMany();
  const rules = await prisma.demandRule.findMany({ where: { active: true } });

  const results: Array<Record<string, unknown>> = [];
  for (const user of users) {
    // pendente selecionado pode nunca ter conectado: sem token, não há o que
    // sincronizar. Pré-condição técnica, não sinal de estado.
    if (!user.refreshToken) {
      continue;
    }
    const now = new Date();
    try {
      const tokens = await refreshAccessToken(decryptSecret(user.refreshToken, key));
      const delta = await fetchInboxDelta(tokens.accessToken, user.deltaLink);
      const counts = await ingestMessages(delta.messages, routes, rules, store);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // Rotação do refresh token, se o Entra devolveu um novo.
          ...(tokens.refreshToken
            ? { refreshToken: encryptSecret(tokens.refreshToken, key) }
            : {}),
          deltaLink: delta.deltaLink,
          ...afterSyncSuccess(now),
        },
      });
      results.push({ user: user.email, ...counts });
    } catch (error) {
      // Não falha em silêncio: uma conta dessincronizada perde demandas.
      console.error(`[sync] falha para ${user.email}`, error);
      const message = error instanceof Error ? error.message : "erro desconhecido";
      if (error instanceof GraphAuthError) {
        // Marca reauth_required e MANTÉM o refreshToken: apagá-lo impede a
        // conta de voltar. O banner (layout) avisa o analista.
        await prisma.user.update({
          where: { id: user.id },
          data: afterAuthFailure(now, message),
        });
        results.push({ user: user.email, error: "reauth_required" });
      } else {
        // Transitório: segue ativo, tenta de novo no próximo cron.
        await prisma.user.update({
          where: { id: user.id },
          data: afterTransientFailure(now, message),
        });
        results.push({ user: user.email, error: message });
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
