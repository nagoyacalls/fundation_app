import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./crypto";

const key = randomBytes(32);

describe("encryptSecret / decryptSecret", () => {
  it("faz o ciclo completo cifrar → decifrar", () => {
    const payload = encryptSecret("refresh-token-do-graph", key);
    expect(decryptSecret(payload, key)).toBe("refresh-token-do-graph");
  });

  it("nunca persiste o segredo em claro", () => {
    const payload = encryptSecret("refresh-token-do-graph", key);
    expect(payload).not.toContain("refresh-token-do-graph");
  });

  it("gera payloads diferentes para o mesmo segredo (IV aleatório)", () => {
    expect(encryptSecret("mesmo", key)).not.toBe(encryptSecret("mesmo", key));
  });

  it("falha ao decifrar payload adulterado", () => {
    const payload = encryptSecret("segredo", key);
    const [iv, ciphertext, tag] = payload.split(".");
    const tampered = Buffer.from(ciphertext, "base64");
    tampered[0] ^= 0xff;
    expect(() =>
      decryptSecret([iv, tampered.toString("base64"), tag].join("."), key),
    ).toThrow();
  });

  it("falha ao decifrar com a chave errada", () => {
    const payload = encryptSecret("segredo", key);
    expect(() => decryptSecret(payload, randomBytes(32))).toThrow();
  });

  it("rejeita chave com tamanho errado", () => {
    expect(() => encryptSecret("segredo", randomBytes(16))).toThrow();
    expect(() => decryptSecret("a.b.c", randomBytes(16))).toThrow();
  });

  it("rejeita payload fora do formato iv.ciphertext.tag", () => {
    expect(() => decryptSecret("não-é-um-payload", key)).toThrow();
  });
});
