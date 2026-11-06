import type { Export } from "@todone/sdk/export";
import type { List, Task } from "@todone/sdk/tasks";
import { api } from "@/lib/api";
import { decryptList, encryptList, keyFor, teamKey } from "@/lib/vault";

// The one place lists cross to the server: encrypted on the way out, decrypted on the way in, so the rest of the
// app works on readable lists. A list with `plain` set (encryption switched off) goes as it is.
type Stored = List & { data?: string };

// Whose lists these calls are about: the personal workspace (null) or a team. Set when the workspace changes.
let workspace: string | null = null;
export const setWorkspace = (org: string | null) => void (workspace = org);
// True when this team's key hasn't been given to you yet: its encrypted lists can't be shown.
let waiting = false;
export const waitingForTeamKey = () => waiting;

async function open(l: Stored): Promise<List | null> {
  if (!l.data) return { ...l, plain: true };
  const key = await keyFor(workspace);
  if (!key) return null;
  const { name, tasks } = await decryptList<Task[]>(key, l.id, l.data);
  const rest = { ...l };
  delete rest.data;
  return { ...rest, name, tasks };
}
async function body(id: string, name: string, tasks: Task[], plain?: boolean) {
  if (plain) return { name, tasks };
  const key = await keyFor(workspace);
  if (!key) throw new Error("A teammate needs to confirm you before you can add to this team's lists.");
  return { data: await encryptList(key, id, { name, tasks }) };
}

export async function fetchLists(): Promise<List[]> {
  const rows = await api<Stored[]>("GET", "/lists");
  const opened = await Promise.all(rows.map(open));
  waiting = opened.some((l) => l === null);
  return opened.filter((l): l is List => !!l);
}
export async function createList(id: string, name: string, tasks: Task[], kind?: "ideas", plain?: boolean) {
  const l = await api<Stored>("POST", "/lists", { id, kind: kind ?? "list", ...(await body(id, name, tasks, plain)) });
  return (await open(l))!;
}
// Saves only if nobody else saved since `version`; either way returns what is stored now (null if gone).
export async function saveList(id: string, version: number, name: string, tasks: Task[], plain?: boolean) {
  const r = await api<{ ok: boolean; list: Stored | null }>("PUT", `/lists/${encodeURIComponent(id)}`, {
    version,
    ...(await body(id, name, tasks, plain)),
  });
  return { ok: r.ok, list: r.list ? await open(r.list) : null };
}
// Encrypts a workspace's lists that are still stored readable: an account's personal lists on its first sign-in
// after encryption arrived, or a team's when it first gets a key. Lists made by integrations are included; their
// owner can switch encryption off again for those. The server lists the active workspace, so pass that one.
export async function encryptPlainLists(org: string | null = null) {
  const before = workspace;
  workspace = org;
  try {
    for (const l of await api<Stored[]>("GET", "/lists"))
      if (!l.data) await saveList(l.id, l.version, l.name, l.tasks, false);
  } finally {
    workspace = before;
  }
}
export const deleteList = (id: string) => api<null>("DELETE", `/lists/${encodeURIComponent(id)}`);
export const reorderLists = (ids: string[]) => api<null>("PUT", "/lists/order", { ids });
// True on a person's first visit with an empty workspace: the app then makes the sample lists (encrypted).
export const startOnboarding = () => api<boolean>("POST", "/onboarding");
export const sendFeedback = (kind: string, body: string, page: string) =>
  api<null>("POST", "/feedback", { kind, body, page });

// "Export everything": every list you can see, decrypted here with your key or each team's.
export async function exportData(): Promise<Export> {
  const rows = await api<
    { id: string; name: string; tasks: Task[]; kind: string; data: string | null; org: string | null; orgName: string | null }[]
  >("GET", "/export");
  const spaces = new Map<string, Export["workspaces"][number]>();
  for (const r of rows) {
    const key = r.data ? (r.org ? await teamKey(r.org) : await keyFor(null)) : null;
    if (r.data && !key) continue; // a team that hasn't given you its key yet
    const l = r.data ? await decryptList<Task[]>(key!, r.id, r.data) : { name: r.name, tasks: r.tasks };
    const space = r.org ?? "personal";
    if (!spaces.has(space)) spaces.set(space, { name: r.orgName ?? "Personal", team: !!r.org, lists: [] });
    spaces.get(space)!.lists.push({ name: l.name, ideas: r.kind === "ideas", tasks: l.tasks });
  }
  return { exportedAt: new Date().toISOString(), workspaces: [...spaces.values()] };
}
