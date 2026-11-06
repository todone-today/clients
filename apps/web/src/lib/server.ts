// Where the todone server is, for this app's own server-side code (the browser uses /api, forwarded there).
export const server = () => process.env.SERVER_URL ?? "http://localhost:4000";

// Sent with every request to the server: when the server sits behind its own HTTPS address (Caddy), it refuses
// requests without it. Unset locally and on a single machine, where it isn't needed.
export const proxyHeaders = (): Record<string, string> =>
  process.env.PROXY_SECRET ? { "x-todone-proxy": process.env.PROXY_SECRET } : {};
