// The key vault, for the video: the real module, except that this browser already holds the keys (so the signed-in
// app opens straight onto its lists instead of asking for a password) and teams already have theirs.
export * from "../../../web/src/lib/vault";

export const loadVault = async (_userId?: string) => true;
export const teamKey = async (_org: string, _fresh = false) => ({}) as CryptoKey;
export const teamMembers = async (_org: string) => [];
export const startTeam = async (_org: string) => {};
