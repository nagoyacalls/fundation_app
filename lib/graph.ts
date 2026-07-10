// Cliente do Microsoft Graph para o sync do inbox. Ver docs/sync.md.

// Escopos de docs/sync.md. Nada além disso — nunca escopo de escrita.
export const GRAPH_SCOPES = "openid profile email offline_access Mail.Read";

// Só metadados e preview — o corpo nunca é pedido nem armazenado.
const DELTA_SELECT = "subject,bodyPreview,from,receivedDateTime,webLink";

export const INITIAL_DELTA_URL = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$select=${DELTA_SELECT}`;

/** Conta precisa de novo login; quem chama zera o refresh token. */
export class GraphAuthError extends Error {}

export class GraphSyncError extends Error {}

export interface GraphMessage {
  id?: string;
  subject?: string | null;
  bodyPreview?: string | null;
  from?: { emailAddress?: { address?: string | null } | null } | null;
  receivedDateTime?: string;
  webLink?: string | null;
  "@removed"?: unknown;
}

export interface DeltaResult {
  messages: GraphMessage[];
  deltaLink: string;
}

const MAX_RATE_LIMIT_RETRIES = 3;

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface TokenPair {
  accessToken: string;
  /** O Entra rotaciona o refresh token; nulo quando não veio um novo. */
  refreshToken: string | null;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenPair> {
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
  if (!issuer || !clientId || !clientSecret) {
    throw new GraphSyncError("Configuração do Entra ID ausente no ambiente");
  }

  const tokenUrl = `${issuer.replace(/\/v2\.0\/?$/, "")}/oauth2/v2.0/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: GRAPH_SCOPES,
    }),
  });

  if (response.status === 400 || response.status === 401) {
    // invalid_grant: refresh token expirado ou revogado — só novo login resolve
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new GraphAuthError(body?.error ?? `token endpoint ${response.status}`);
  }
  if (!response.ok) {
    throw new GraphSyncError(`token endpoint respondeu ${response.status}`);
  }

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  if (!json.access_token) {
    throw new GraphSyncError("token endpoint não devolveu access_token");
  }
  return { accessToken: json.access_token, refreshToken: json.refresh_token ?? null };
}

/**
 * Percorre o delta do inbox até o fim e devolve as mensagens + o novo
 * deltaLink. Sem deltaLink começa do zero (backlog recente); com ele, só
 * mudanças. `410 Gone` = deltaLink expirado: recomeça do zero — o upsert por
 * graphId garante que o backlog repetido não duplica nada.
 */
export async function fetchInboxDelta(
  accessToken: string,
  deltaLink?: string | null,
  { sleep = defaultSleep }: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<DeltaResult> {
  const messages: GraphMessage[] = [];
  let url = deltaLink ?? INITIAL_DELTA_URL;
  let restarted = deltaLink == null;
  let rateLimitRetries = 0;

  for (;;) {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      // O access token acabou de ser emitido; 401 aqui não se resolve com
      // outro refresh — a conta precisa de novo login.
      throw new GraphAuthError("Graph recusou o access token");
    }
    if (response.status === 429) {
      rateLimitRetries += 1;
      if (rateLimitRetries > MAX_RATE_LIMIT_RETRIES) {
        throw new GraphSyncError("rate limit persistente no Graph");
      }
      const retryAfter = Number(response.headers.get("retry-after") ?? "1");
      await sleep((Number.isFinite(retryAfter) ? retryAfter : 1) * 1000);
      continue;
    }
    if (response.status === 410) {
      if (restarted) {
        throw new GraphSyncError("delta expirou mesmo após reinício");
      }
      restarted = true;
      url = INITIAL_DELTA_URL;
      messages.length = 0;
      continue;
    }
    if (!response.ok) {
      throw new GraphSyncError(`Graph respondeu ${response.status}`);
    }

    rateLimitRetries = 0;
    const json = (await response.json()) as {
      value?: GraphMessage[];
      "@odata.nextLink"?: string;
      "@odata.deltaLink"?: string;
    };
    messages.push(...(json.value ?? []));

    const nextDeltaLink = json["@odata.deltaLink"];
    if (nextDeltaLink) {
      return { messages, deltaLink: nextDeltaLink };
    }
    const nextLink = json["@odata.nextLink"];
    if (!nextLink) {
      throw new GraphSyncError("resposta delta sem nextLink nem deltaLink");
    }
    url = nextLink;
  }
}
