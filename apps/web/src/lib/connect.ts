"use client";

// AI apps on your computer (the todone-mcp connector, server actions/connectors.ts). Each person has one code for
// all their AI apps; it signs the connector in. It holds no key, so an AI app can read and change only what you
// made readable (Privacy); encrypted things stay private.
import { api } from "./api";

export type Code = { code: string; used: number | null };
export const myCode = () => api<Code>("GET", "/connectors/code");
// Replaces it: the old code stops working in every app.
export const newCode = () => api<Code>("POST", "/connectors/code", {});

// How to add todone to each app, in as few steps as each allows (github.com/todone-today/todone-mcp). `url`: set only
// when this isn't todone's own address (a local copy while developing), so the connector talks to the same place.
export const VERSION = "0.2.0";
export type App = "Claude Desktop" | "Claude Code" | "ChatGPT" | "Cursor" | "VS Code" | "Gemini CLI";
export const APPS: App[] = ["Claude Desktop", "Claude Code", "ChatGPT", "Cursor", "VS Code", "Gemini CLI"];
// ChatGPT's desktop app takes the server field by field, and starts it without your shell's PATH, so npx can't find
// Node unless we say where it usually lives (Homebrew on Apple and Intel Macs, then the system).
// ponytail: Node from nvm/fnm lives elsewhere; those people swap in the folder `which npx` prints.
export const CHATGPT_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
// Claude Desktop installs this file with a double-click and asks for the code itself.
export const DESKTOP_FILE = "https://github.com/todone-today/todone-mcp/releases/latest/download/todone.mcpb";
export const GEMINI = "gemini extensions install https://github.com/todone-today/todone-mcp";

const server = (code: string, url?: string) => ({
  command: "npx",
  args: ["-y", `todone-mcp@${VERSION}`],
  env: { TODONE_CONNECT: code, ...(url ? { TODONE_URL: url } : {}) },
});
// The link only goes from this browser to the app on this computer.
export const cursorLink = (code: string, url?: string) =>
  `cursor://anysphere.cursor-deeplink/mcp/install?name=todone&config=${encodeURIComponent(btoa(JSON.stringify(server(code, url))))}`;
export const vscodeLink = (code: string, url?: string) =>
  `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: "todone", type: "stdio", ...server(code, url) }))}`;
// One command for a terminal, code included: nothing to answer afterwards.
export function claudeCode(code: string, url?: string) {
  const env = [`TODONE_CONNECT=${code}`, ...(url ? [`TODONE_URL=${url}`] : [])].map((e) => `-e ${e}`).join(" ");
  return `claude mcp add todone --scope user ${env} -- npx -y todone-mcp@${VERSION}`;
}
