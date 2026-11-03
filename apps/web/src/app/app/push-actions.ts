import { api } from "@/lib/api";

export const pushKey = () => api<string | null>("GET", "/push/key");
export const subscribePush = (sub: PushSubscriptionJSON, timeZone: string) =>
  api<string>("POST", "/push/subscription", { sub, timeZone });
export const unsubscribePush = (endpoint: string) => api<null>("DELETE", "/push/subscription", { endpoint });
export const testPush = () => api<string>("POST", "/push/test");
