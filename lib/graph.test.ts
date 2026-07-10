import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchInboxDelta,
  GraphAuthError,
  GraphSyncError,
  INITIAL_DELTA_URL,
  refreshAccessToken,
} from "./graph";

// Nunca chamar a API real: cada teste enfileira respostas mockadas do Graph.
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers });
}

const noSleep = { sleep: vi.fn(async () => {}) };

beforeEach(() => {
  fetchMock.mockReset();
  noSleep.sleep.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchInboxDelta", () => {
  it("primeira sync: começa do zero, pagina pelo nextLink e devolve o deltaLink", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          value: [{ id: "m1" }, { id: "m2" }],
          "@odata.nextLink": "https://graph.microsoft.com/next-page",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: [{ id: "m3" }],
          "@odata.deltaLink": "https://graph.microsoft.com/delta-final",
        }),
      );

    const result = await fetchInboxDelta("token", null, noSleep);

    expect(fetchMock.mock.calls[0][0]).toBe(INITIAL_DELTA_URL);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://graph.microsoft.com/next-page",
    );
    expect(result.messages.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    expect(result.deltaLink).toBe("https://graph.microsoft.com/delta-final");
  });

  it("sync incremental: parte do deltaLink persistido e traz só as mudanças", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        value: [{ id: "novo" }],
        "@odata.deltaLink": "https://graph.microsoft.com/delta-2",
      }),
    );

    const result = await fetchInboxDelta(
      "token",
      "https://graph.microsoft.com/delta-1",
      noSleep,
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://graph.microsoft.com/delta-1",
    );
    expect(result.messages.map((m) => m.id)).toEqual(["novo"]);
    expect(result.deltaLink).toBe("https://graph.microsoft.com/delta-2");
  });

  it("envia o access token no header Authorization", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ value: [], "@odata.deltaLink": "d" }),
    );
    await fetchInboxDelta("token-abc", null, noSleep);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { authorization: "Bearer token-abc" },
    });
  });

  it("deltaLink expirado (410): recomeça do zero e descarta o parcial", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 410))
      .mockResolvedValueOnce(
        jsonResponse({
          value: [{ id: "backlog-1" }],
          "@odata.deltaLink": "https://graph.microsoft.com/delta-novo",
        }),
      );

    const result = await fetchInboxDelta(
      "token",
      "https://graph.microsoft.com/delta-expirado",
      noSleep,
    );

    expect(fetchMock.mock.calls[1][0]).toBe(INITIAL_DELTA_URL);
    expect(result.messages.map((m) => m.id)).toEqual(["backlog-1"]);
    expect(result.deltaLink).toBe("https://graph.microsoft.com/delta-novo");
  });

  it("falha se o delta expirar de novo após o reinício", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 410))
      .mockResolvedValueOnce(jsonResponse({}, 410));

    await expect(
      fetchInboxDelta("token", "https://graph.microsoft.com/delta", noSleep),
    ).rejects.toBeInstanceOf(GraphSyncError);
  });

  it("429: respeita o Retry-After e tenta de novo", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({}, 429, { "retry-after": "2" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ value: [{ id: "m1" }], "@odata.deltaLink": "d" }),
      );

    const result = await fetchInboxDelta("token", null, noSleep);

    expect(noSleep.sleep).toHaveBeenCalledWith(2000);
    expect(result.messages.map((m) => m.id)).toEqual(["m1"]);
  });

  it("429 persistente: desiste com erro em vez de girar para sempre", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 429, { "retry-after": "1" }));

    await expect(fetchInboxDelta("token", null, noSleep)).rejects.toBeInstanceOf(
      GraphSyncError,
    );
  });

  it("401: sinaliza que a conta precisa de novo login", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));

    await expect(fetchInboxDelta("token", null, noSleep)).rejects.toBeInstanceOf(
      GraphAuthError,
    );
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    vi.stubEnv(
      "AUTH_MICROSOFT_ENTRA_ID_ISSUER",
      "https://login.microsoftonline.com/tenant-x/v2.0",
    );
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "client-id");
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_SECRET", "client-secret");
  });

  it("troca o refresh token por um access token no endpoint do tenant", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: "novo-access", refresh_token: "novo-refresh" }),
    );

    const tokens = await refreshAccessToken("refresh-antigo");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://login.microsoftonline.com/tenant-x/oauth2/v2.0/token",
    );
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("refresh-antigo");
    expect(body.get("scope")).toContain("Mail.Read");
    expect(tokens).toEqual({
      accessToken: "novo-access",
      refreshToken: "novo-refresh",
    });
  });

  it("refresh token sem rotação devolve refreshToken nulo", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: "a" }));
    const tokens = await refreshAccessToken("refresh");
    expect(tokens.refreshToken).toBeNull();
  });

  it("invalid_grant: conta marcada para novo login", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "invalid_grant" }, 400),
    );

    await expect(refreshAccessToken("revogado")).rejects.toBeInstanceOf(
      GraphAuthError,
    );
  });

  it("erro de servidor não zera a conta: é falha transitória", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 503));

    await expect(refreshAccessToken("refresh")).rejects.toBeInstanceOf(
      GraphSyncError,
    );
  });
});
