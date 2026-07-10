// Máquina de estado da sincronização de uma conta. Ver docs/dominio.md.
// syncStatus é o ÚNICO sinal de que uma conta pode sincronizar — nunca o
// refreshToken. Estas funções são puras: a rota e o callback de login só
// aplicam o resultado no banco.

export type SyncStatusValue = "pendente" | "ativo" | "reauth_required";

// Contas elegíveis à seleção do /api/sync. reauth_required fica de fora:
// o Graph já recusou o token, só um novo login recupera.
export const SYNCABLE_STATUSES: readonly SyncStatusValue[] = ["pendente", "ativo"];

export function canSync(status: SyncStatusValue): boolean {
  return SYNCABLE_STATUSES.includes(status);
}

/**
 * Campos de estado que uma tentativa de sync grava. `refreshToken` está
 * ausente de propósito nas falhas: apagá-lo é exatamente o bug que esta
 * máquina corrige (docs/dominio.md).
 */
export interface SyncStateUpdate {
  syncStatus?: SyncStatusValue;
  lastSyncAt?: Date;
  lastSyncError?: string | null;
}

export function afterSyncSuccess(now: Date): SyncStateUpdate {
  return { syncStatus: "ativo", lastSyncAt: now, lastSyncError: null };
}

/**
 * Graph recusou o token (401 / invalid_grant). Marca reauth_required e NÃO
 * toca no refreshToken — mantê-lo é o que permite a conta voltar após o login.
 */
export function afterAuthFailure(now: Date, message: string): SyncStateUpdate {
  return {
    syncStatus: "reauth_required",
    lastSyncAt: now,
    lastSyncError: message,
  };
}

/**
 * Erro transitório (5xx, rede). Registra o erro mas mantém ativo: tenta de
 * novo no próximo cron. Não vira reauth_required — o token continua válido.
 */
export function afterTransientFailure(
  now: Date,
  message: string,
): SyncStateUpdate {
  return { lastSyncAt: now, lastSyncError: message };
}

/**
 * Campos gravados no login. Só quando o Entra devolve um refresh token novo:
 * grava o token cifrado e reativa a conta. Sem token novo, retorna vazio —
 * o status atual é preservado, então uma conta em reauth_required continua
 * em reauth_required até o consent devolver um token, e o banner segue visível.
 */
export interface LoginTokenUpdate {
  refreshToken?: string;
  syncStatus?: SyncStatusValue;
}

export function afterLogin(
  encryptedRefreshToken: string | null,
): LoginTokenUpdate {
  if (encryptedRefreshToken === null) {
    return {};
  }
  return { refreshToken: encryptedRefreshToken, syncStatus: "ativo" };
}
