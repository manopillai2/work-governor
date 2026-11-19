// Server-only. AES-256-GCM encryption for connection secrets (client
// secrets, passwords, API keys) at rest in the database. The key is
// CONNECTION_SECRETS_KEY in .env.local (32 random bytes, base64). Values
// are decrypted only in the collector runner, straight into the
// script's environment -- never returned to the browser, logged, or sent
// to the AI.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

function key(): Buffer {
  const raw = process.env.CONNECTION_SECRETS_KEY ?? "";
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) {
    throw new Error(
      "CONNECTION_SECRETS_KEY is missing or invalid in .env.local (needs 32 random bytes, base64). Restart the app after adding it."
    );
  }
  return k;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, data]).toString("base64");
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) throw new Error("A stored secret is not in the expected encrypted format.");
  const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
