"use client";

// AI apps on your computer (the todone-mcp connector, server actions/connectors.ts). Each person has one code for
// all their AI apps; it signs the connector in. It holds no key, so an AI app can read and change only what you
// made readable (Privacy); encrypted things stay private.
import { api } from "./api";

export type Code = { code: string; used: number | null };
export const myCode = () => api<Code>("GET", "/connectors/code");
// Replaces it: the old code stops working in every app.
export const newCode = () => api<Code>("POST", "/connectors/code", {});

// How to add todone to each app. Claude Code and Gemini CLI install from github.com/todone-today/todone-mcp and ask
// for the code; the others take one block with the code inside. `url`: set only when this isn't todone's own
// address (a local copy while developing), so the connector talks to the same place.
export const VERSION = "0.2.0";
export type App = "Claude Code" | "Claude Desktop" | "ChatGPT" | "Gemini CLI" | "Cursor";
export const APPS: App[] = ["Claude Code", "Claude Desktop", "ChatGPT", "Gemini CLI", "Cursor"];
// ChatGPT's desktop app takes the server field by field, and starts it without your shell's PATH, so npx can't find
// Node unless we say where it usually lives (Homebrew on Apple and Intel Macs, then the system).
// ponytail: Node from nvm/fnm lives elsewhere; those people swap in the folder `which npx` prints.
export const CHATGPT_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
export const COMMANDS: Partial<Record<App, string>> = {
  "Claude Code": "/plugin install todone --marketplace todone-today/todone-mcp",
  "Gemini CLI": "gemini extensions install https://github.com/todone-today/todone-mcp",
};
export function config(code: string, url?: string) {
  const env = { TODONE_CONNECT: code, ...(url ? { TODONE_URL: url } : {}) };
  return JSON.stringify({ mcpServers: { todone: { command: "npx", args: ["-y", `todone-mcp@${VERSION}`], env } } }, null, 2);
}
