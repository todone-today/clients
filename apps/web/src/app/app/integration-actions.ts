import type { Integrations, Share } from "@todone/sdk/api";
import type { CalView } from "@todone/sdk/calendar";
import { api } from "@/lib/api";

export const getIntegrations = () => api<Integrations>("GET", "/integrations");
export const setCalendar = (on: boolean) => api<string | null>("PUT", "/integrations/calendar", { on });
export const setMarkdownSync = (on: boolean) => api<null>("PUT", "/integrations/markdown", { on });
export const setDiscord = (url: string | null) => api<string>("PUT", "/integrations/discord", { url });
export const setNotion = (token: string | null, database: string, timeZone: string) =>
  api<string>("PUT", "/integrations/notion", { token, database, timeZone });
export const connectGoogle = (timeZone: string) => api<string>("POST", "/integrations/google", { timeZone });
export const disconnectGoogle = () => api<null>("DELETE", "/integrations/google");
export const syncNow = () => api<string>("POST", "/integrations/sync");
export const shareCalendar = (view: CalView, at: string) =>
  api<{ token: string } | { error: string }>("POST", "/shares", { view, at });
export const listShares = () => api<Share[]>("GET", "/shares");
export const stopShare = (token: string) => api<null>("DELETE", `/shares/${encodeURIComponent(token)}`);
