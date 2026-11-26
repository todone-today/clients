import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Account, parseCode } from "./account.ts";
import { register } from "./tools.ts";

// todone for AI apps (MCP over stdio). Set TODONE_CONNECT to the code from todone: Account → Connect an AI.
// TODONE_URL points at another todone (a local one while developing).
const code = process.env.TODONE_CONNECT;
if (!code) {
  console.error("Set TODONE_CONNECT to the code from todone: Account → Connect an AI.");
  process.exit(1);
}
const acc = new Account((process.env.TODONE_URL ?? "https://app.todone.today").replace(/\/$/, ""), parseCode(code));
await acc.unlock().catch((e: Error) => {
  console.error(`todone: ${e.message}`);
  process.exit(1);
});

const server = new McpServer(
  { name: "todone", version: "0.1.0" },
  {
    instructions:
      "todone is the person's to-do app: lists of tasks (with steps, dates, repeats), a Brainstorm for loose ideas, goals, and rewards bought with karma points earned by finishing tasks. Read before changing (get_lists, get_list, search), use the ids it returns, and ask before deleting.",
  },
);
register(server, acc);
await server.connect(new StdioServerTransport());
