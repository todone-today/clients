"use client";

// AI apps on your computer (the todone-mcp connector, server actions/connectors.ts). A connection code is a token
// that signs the connector in (the server keeps only its hash) and a secret that unwraps your account key on that
// computer. The account key is wrapped to the secret here, after your password re-derives it, and only the
// wrapped form goes to the server. So your lists stay end-to-end encrypted.
import * as C from "@todone/sdk/crypto";
import { api } from "./api";

export type Connection = { id: string; name: string; created: number; used: number | null };

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export const connections = () => api<Connection[]>("GET", "/connectors");
export const removeConnection = (id: string) => api("DELETE", `/connectors/${encodeURIComponent(id)}`);
// Whether this account unlocks with a password (else a passphrase it chose when signing in with Google and the like).
export const usesPassword = () => api<{ hasPassword?: boolean }>("GET", "/keys").then((k) => !!k.hasPassword);

// `secret`: the password, or the unlock passphrase. Returns the new connection with its code (shown once).
export async function makeConnection(name: string, secret: string) {
  const k = await api<{ kdfSalt: string | null; kdfIter?: number; wrappedKey: string }>("GET", "/keys");
  if (!k.kdfSalt) throw new Error("Sign out and in again to finish setting up encryption first.");
  // Never fewer rounds than the server lets anyone set (as vault.ts checks), so a bad server can't weaken this.
  if (k.kdfIter !== undefined && (!Number.isInteger(k.kdfIter) || k.kdfIter < 100_000 || k.kdfIter > 10_000_000))
    throw new Error("This account's key settings look wrong.");
  const { wrapKey } = await C.deriveLogin(secret, k.kdfSalt, k.kdfIter);
  const accountKey = await C.unwrapSymmetric(wrapKey, k.wrappedKey, true).catch(() => {
    throw new Error("That isn't right. Try again.");
  });
  const token = `tdn_${b64url(random(32))}`;
  const keyBytes = random(32);
  const wrapTo = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
  const wrappedKey = await C.wrapSymmetric(wrapTo, accountKey);
  const tokenHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const c = await api<Connection>("POST", "/connectors", { name, tokenHash, wrappedKey });
  return { ...c, code: `${token}.${b64url(keyBytes)}` };
}

// What to paste where, for the apps people use most. `url`: set only when this isn't todone's own address
// (a local copy while developing), so the connector talks to the same place.
export function setups(code: string, url?: string) {
  const env = { TODONE_CONNECT: code, ...(url ? { TODONE_URL: url } : {}) };
  const json = JSON.stringify({ mcpServers: { todone: { command: "npx", args: ["-y", "todone-mcp"], env } } }, null, 2);
  const flags = Object.entries(env)
    .map(([k, v]) => `--env ${k}=${v}`)
    .join(" ");
  return [
    { app: "Claude Desktop", where: "Settings → Developer → Edit Config. Paste this, save, then quit and reopen Claude.", text: json },
    { app: "Claude Code", where: "Run this in a terminal.", text: `claude mcp add todone ${flags} -- npx -y todone-mcp` },
    { app: "Cursor", where: "Settings → MCP → Add new server, or paste into ~/.cursor/mcp.json.", text: json },
    { app: "Other apps", where: "Any app that takes MCP servers: run npx -y todone-mcp with this setting.", text: Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") },
  ];
}
