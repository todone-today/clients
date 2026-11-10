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
  // 402: it needs a paid plan; the app shows the plans (app/app/PlanPrompt.tsx).
  if (r.status === 402) dispatchEvent(new CustomEvent(PLAN_EVENT, { detail: data?.error }));
  if (!r.ok) throw Object.assign(new Error(data?.error ?? `The server said ${r.status}.`), { status: r.status });
  return data as T;
}

export const PLAN_EVENT = "todone:plan";
