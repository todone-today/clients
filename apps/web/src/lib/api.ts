// Calls the todone server. The browser reaches it at this site's own /api (next.config.ts forwards it), so the
// session cookie goes along; a failed call throws an Error with the server's message.
export async function api<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  const r = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error ?? `The server said ${r.status}.`);
  return data as T;
}
