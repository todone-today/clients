// Where the todone server is, for this app's own server-side code (the browser uses /api, forwarded there).
export const server = () => process.env.SERVER_URL ?? "http://localhost:4000";
