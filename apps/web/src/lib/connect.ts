"use client";

// AI apps on your computer (the todone-mcp connector, server actions/connectors.ts). A connection code is a token
// that signs the connector in; the server keeps only its hash. It holds no key, so the AI app can read and change
// only lists you made readable (Account → Privacy); encrypted ones stay private.
import { api } from "./api";

export type Connection = { id: string; name: string; created: number; used: number | null };

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export const connections = () => api<Connection[]>("GET", "/connectors");
export const removeConnection = (id: string) => api("DELETE", `/connectors/${encodeURIComponent(id)}`);

// A new connection named after its app; returns it with its code (shown once).
export async function makeConnection(name: string) {
  const token = `tdn_${b64url(crypto.getRandomValues(new Uint8Array(32)))}`;
  const tokenHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  const c = await api<Connection>("POST", "/connectors", { name, tokenHash });
  return { ...c, code: token };
}

// How to add todone to each app. Claude Code and Gemini CLI install from github.com/todone-today/todone-mcp and ask
// for the code; the others take one block with the code inside. `url`: set only when this isn't todone's own
// address (a local copy while developing), so the connector talks to the same place.
export const VERSION = "0.2.0";
export type App = "Claude Code" | "Claude Desktop" | "Gemini CLI" | "Cursor";
export const APPS: App[] = ["Claude Code", "Claude Desktop", "Gemini CLI", "Cursor"];
export const COMMANDS: Partial<Record<App, string>> = {
  "Claude Code": "/plugin install todone --marketplace todone-today/todone-mcp",
  "Gemini CLI": "gemini extensions install https://github.com/todone-today/todone-mcp",
};
export function config(code: string, url?: string) {
  const env = { TODONE_CONNECT: code, ...(url ? { TODONE_URL: url } : {}) };
  return JSON.stringify({ mcpServers: { todone: { command: "npx", args: ["-y", `todone-mcp@${VERSION}`], env } } }, null, 2);
}
