// Criptografia do refresh token do Graph antes de persistir (docs/dominio.md).
// AES-256-GCM: autenticado, então payload adulterado falha em vez de
// devolver lixo silenciosamente.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

/** Formato persistido: iv.ciphertext.tag, cada parte em base64. */
export function encryptSecret(plaintext: string, key: Buffer): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [iv, ciphertext, cipher.getAuthTag()]
    .map((part) => part.toString("base64"))
    .join(".");
}

export function decryptSecret(payload: string, key: Buffer): string {
  assertKey(key);
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Payload cifrado em formato inválido");
  }
  const [iv, ciphertext, tag] = parts.map((part) =>
    Buffer.from(part, "base64"),
  );
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** TOKEN_ENCRYPTION_KEY: 32 bytes em base64 (`openssl rand -base64 32`). */
export function encryptionKeyFromEnv(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY ausente");
  }
  const key = Buffer.from(raw, "base64");
  assertKey(key);
  return key;
}

function assertKey(key: Buffer): void {
  if (key.length !== KEY_BYTES) {
    throw new Error(`Chave de criptografia deve ter ${KEY_BYTES} bytes`);
  }
}
