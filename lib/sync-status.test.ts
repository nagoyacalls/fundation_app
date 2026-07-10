import { describe, expect, it } from "vitest";

import {
  afterAuthFailure,
  afterLogin,
  afterSyncSuccess,
  afterTransientFailure,
  canSync,
  SYNCABLE_STATUSES,
  type SyncStatusValue,
} from "./sync-status";

const now = new Date("2026-07-10T12:00:00Z");

describe("canSync", () => {
  it("seleciona pendente e ativo", () => {
    expect(canSync("pendente")).toBe(true);
    expect(canSync("ativo")).toBe(true);
  });

  it("nunca seleciona reauth_required", () => {
    expect(canSync("reauth_required")).toBe(false);
  });

  it("SYNCABLE_STATUSES não inclui reauth_required", () => {
    expect(SYNCABLE_STATUSES).not.toContain("reauth_required");
  });
});

describe("afterSyncSuccess", () => {
  it("marca ativo, registra o horário e limpa o erro", () => {
    expect(afterSyncSuccess(now)).toEqual({
      syncStatus: "ativo",
      lastSyncAt: now,
      lastSyncError: null,
    });
  });
});

describe("afterAuthFailure", () => {
  it("marca reauth_required e registra o erro", () => {
    expect(afterAuthFailure(now, "invalid_grant")).toEqual({
      syncStatus: "reauth_required",
      lastSyncAt: now,
      lastSyncError: "invalid_grant",
    });
  });

  it("nunca inclui refreshToken no update — o token é preservado", () => {
    expect(afterAuthFailure(now, "x")).not.toHaveProperty("refreshToken");
  });
});

describe("afterTransientFailure", () => {
  it("registra o erro mas não mexe no syncStatus", () => {
    const update = afterTransientFailure(now, "503");
    expect(update).toEqual({ lastSyncAt: now, lastSyncError: "503" });
    expect(update).not.toHaveProperty("syncStatus");
  });
});

describe("afterLogin", () => {
  it("com token novo, grava o token e reativa a conta", () => {
    expect(afterLogin("cifra")).toEqual({
      refreshToken: "cifra",
      syncStatus: "ativo",
    });
  });

  it("sem token novo, não altera nada", () => {
    expect(afterLogin(null)).toEqual({});
  });
});

// O teste que é a razão desta etapa (docs/sync.md): uma conta que expira volta
// a sincronizar depois do login. Simula o estado do usuário como um registro em
// memória e aplica as transições na sequência real.
describe("ciclo expirar → relogar → voltar a sincronizar", () => {
  it("recupera a conta sem nunca apagar o refreshToken", () => {
    const user: {
      syncStatus: SyncStatusValue;
      refreshToken: string | null;
      lastSyncError: string | null;
    } = {
      syncStatus: "ativo",
      refreshToken: "token-original-cifrado",
      lastSyncError: null,
    };

    // 1. Conta sincronizando é selecionada.
    expect(canSync(user.syncStatus)).toBe(true);

    // 2. O Graph recusa o token. A rota aplica afterAuthFailure.
    Object.assign(user, afterAuthFailure(now, "invalid_grant"));
    expect(user.syncStatus).toBe("reauth_required");
    // O token continua lá — apagá-lo é o bug que travava a conta.
    expect(user.refreshToken).toBe("token-original-cifrado");

    // 3. Nesse estado, o sync não a seleciona mais; o banner aparece.
    expect(canSync(user.syncStatus)).toBe(false);

    // 4. O analista reloga e o consent devolve um token novo.
    Object.assign(user, afterLogin("token-novo-cifrado"));
    expect(user.syncStatus).toBe("ativo");
    expect(user.refreshToken).toBe("token-novo-cifrado");

    // 5. Selecionável de novo: a caixa volta a gerar demandas.
    expect(canSync(user.syncStatus)).toBe(true);
  });

  it("se o relogin não devolve token, a conta segue em reauth_required", () => {
    let status: SyncStatusValue = "reauth_required";
    const update = afterLogin(null);
    if (update.syncStatus) {
      status = update.syncStatus;
    }
    // Sem token, nada muda: o banner continua até o consent devolver um.
    expect(status).toBe("reauth_required");
    expect(canSync(status)).toBe(false);
  });
});
