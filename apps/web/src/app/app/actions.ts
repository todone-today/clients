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
  const { name, tasks, icon } = await decryptList<Task[]>(key, l.id, l.data);
  const rest = { ...l };
  delete rest.data;
  return { ...rest, name, tasks, ...(icon ? { icon } : {}) };
}
async function body(
  id: string,
  name: string,
  tasks: Task[],
  plain?: boolean,
  icon?: string,
) {
  if (plain) return { name, tasks, icon };
  const key = await keyFor(workspace);
  if (!key)
    throw new Error(
      "A teammate needs to confirm you before you can add to this team's lists.",
    );
  return { data: await encryptList(key, id, { name, tasks, icon }) };
}

export async function fetchLists(): Promise<List[]> {
  const rows = await api<Stored[]>("GET", "/lists");
  const opened = await Promise.all(rows.map(open));
  waiting = opened.some((l) => l === null);
  return opened.filter((l): l is List => !!l);
}
export async function createList(
  id: string,
  name: string,
  tasks: Task[],
  kind?: "ideas" | "bin",
  plain?: boolean,
) {
  const l = await api<Stored>("POST", "/lists", {
    id,
    kind: kind ?? "list",
    ...(await body(id, name, tasks, plain)),
  });
  return (await open(l))!;
}
// Saves only if nobody else saved since `version`; either way returns what is stored now (null if gone).
export async function saveList(
  id: string,
  version: number,
  name: string,
  tasks: Task[],
  plain?: boolean,
  icon?: string,
) {
  const r = await api<{ ok: boolean; list: Stored | null }>(
    "PUT",
    `/lists/${encodeURIComponent(id)}`,
    {
      version,
      ...(await body(id, name, tasks, plain, icon)),
    },
  );
  if (r.ok) pushShared(tasks);
  return { ok: r.ok, list: r.list ? await open(r.list) : null };
}

// Shared tasks (by link, not end-to-end encrypted): after a save, send changed fields to their readable copy, so
// guests see edits made anywhere (stickers, calendar, the panel).
const pushed = new Map<string, string>();
function pushShared(tasks: Task[]) {
  for (const t of tasks.flatMap((x) => [x, ...x.sub]))
    if (t.share) {
      const copy = {
        ...t,
        files: undefined,
        history: undefined,
        share: undefined,
      };
      const json = JSON.stringify(copy);
      if (pushed.get(t.share) === json) continue;
      pushed.set(t.share, json);
      api("PUT", `/task-shares/${t.share}`, { task: copy }).catch(() =>
        pushed.delete(t.share!),
      );
    }
}
// The key for the open workspace's private attachments.
export const workspaceKey = async () => {
  const k = await keyFor(workspace);
  if (!k)
    throw new Error(
      "A teammate needs to confirm you before you can add files to this team's tasks.",
    );
  return k;
};
export const createShare = (task: Task) =>
  api<{ id: string; token: string }>("POST", "/task-shares", {
    task: { ...task, files: undefined, history: undefined },
  });
export const setShareFiles = (id: string, task: Task, files: string[]) =>
  api<null>("PUT", `/task-shares/${id}`, {
    task: { ...task, files: undefined, history: undefined, share: undefined },
    files,
  });
export const shareView = (id: string) =>
  api<{
    token: string;
    task: Task;
    comments: import("@/components/Thread").Comment[];
  }>("GET", `/task-shares/${id}`);
export const rotateShare = (id: string) =>
  api<{ token: string }>("POST", `/task-shares/${id}/rotate`);
export const revokeShare = (id: string) =>
  api<null>("DELETE", `/task-shares/${id}`);
// Encrypts a workspace's lists that are still stored readable: an account's personal lists on its first sign-in
// after encryption arrived, or a team's when it first gets a key. Lists made by integrations are included; their
// owner can switch encryption off again for those. The server lists the active workspace, so pass that one.
export async function encryptPlainLists(org: string | null = null) {
  const before = workspace;
  workspace = org;
  try {
    for (const l of await api<Stored[]>("GET", "/lists"))
      if (!l.data)
        await saveList(l.id, l.version, l.name, l.tasks, false, l.icon);
  } finally {
    workspace = before;
  }
}
export const deleteList = (id: string) =>
  api<null>("DELETE", `/lists/${encodeURIComponent(id)}`);
export const reorderLists = (ids: string[]) =>
  api<null>("PUT", "/lists/order", { ids });
// True on a person's first visit with an empty workspace: the app then makes the sample lists (encrypted).
export const startOnboarding = () => api<boolean>("POST", "/onboarding");
export const sendFeedback = (kind: string, body: string, page: string) =>
  api<null>("POST", "/feedback", { kind, body, page });

// "Export everything": every list you can see, decrypted here with your key or each team's.
export async function exportData(): Promise<Export> {
  const rows = await api<
    {
      id: string;
      name: string;
      tasks: Task[];
      kind: string;
      data: string | null;
      org: string | null;
      orgName: string | null;
    }[]
  >("GET", "/export");
  const spaces = new Map<string, Export["workspaces"][number]>();
  for (const r of rows) {
    if (r.kind === "bin") continue; // recently deleted tasks aren't part of an export
    const key = r.data
      ? r.org
        ? await teamKey(r.org)
        : await keyFor(null)
      : null;
    if (r.data && !key) continue; // a team that hasn't given you its key yet
    const l = r.data
      ? await decryptList<Task[]>(key!, r.id, r.data)
      : { name: r.name, tasks: r.tasks };
    const space = r.org ?? "personal";
    if (!spaces.has(space))
      spaces.set(space, {
        name: r.orgName ?? "Personal",
        team: !!r.org,
        lists: [],
      });
    spaces
      .get(space)!
      .lists.push({ name: l.name, ideas: r.kind === "ideas", tasks: l.tasks });
  }
  return {
    exportedAt: new Date().toISOString(),
    workspaces: [...spaces.values()],
  };
}
