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
export type App = "Claude Desktop" | "Claude Code" | "Codex" | "Cursor" | "VS Code" | "Gemini CLI";
export const APPS: App[] = ["Claude Desktop", "Claude Code", "Codex", "Cursor", "VS Code", "Gemini CLI"];
// Codex (and the ChatGPT desktop app) reads ~/.codex/config.toml and starts servers without your shell's PATH. So one Terminal
// command finds npx where this Mac has it (Homebrew, nvm, …), drops any older todone entry (a new code) and adds it.
// ponytail: Mac and Linux shells only; Windows people fill in Codex's custom MCP form by hand.
export function codex(code: string, url?: string) {
  const env = `TODONE_CONNECT = "${code}"\\n${url ? `TODONE_URL = "${url}"\\n` : ""}PATH = "%s:/usr/bin:/bin"\\n`;
  return (
    `n="$(command -v npx)"; [ -n "$n" ] || { echo "Install Node first: https://nodejs.org"; false; } && ` +
    `f=~/.codex/config.toml; mkdir -p ~/.codex; touch "$f"; ` +
    `awk '/^\\[/{s=($0~/^\\[mcp_servers\\.todone(\\.env)?\\]$/)} !s' "$f" > "$f.tmp" && mv "$f.tmp" "$f"; ` +
    `printf '\\n[mcp_servers.todone]\\ncommand = "%s"\\nargs = ["-y", "todone-mcp@${VERSION}"]\\n\\n[mcp_servers.todone.env]\\n${env}' "$n" "\${n%/*}" >> "$f" && ` +
    `echo "todone is in Codex. Quit Codex and open it again."`
  );
}
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
