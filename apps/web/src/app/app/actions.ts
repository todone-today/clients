import type { Export } from "@todone/sdk/export";
import type { List, Task } from "@todone/sdk/tasks";
import { api } from "@/lib/api";

export const fetchLists = () => api<List[]>("GET", "/lists");
export const createList = (id: string, name: string, tasks: Task[], kind?: "ideas") =>
  api<List>("POST", "/lists", { id, name, tasks, kind: kind ?? "list" });
// Saves only if nobody else saved since `version`; either way returns what is stored now (null if gone).
export const saveList = (id: string, version: number, name: string, tasks: Task[]) =>
  api<{ ok: boolean; list: List | null }>("PUT", `/lists/${encodeURIComponent(id)}`, { version, name, tasks });
export const deleteList = (id: string) => api<null>("DELETE", `/lists/${encodeURIComponent(id)}`);
export const reorderLists = (ids: string[]) => api<null>("PUT", "/lists/order", { ids });
export const startOnboarding = (today: string) => api<boolean>("POST", "/onboarding", { today });
export const exportData = () => api<Export>("GET", "/export");
export const sendFeedback = (kind: string, body: string, page: string) =>
  api<null>("POST", "/feedback", { kind, body, page });
