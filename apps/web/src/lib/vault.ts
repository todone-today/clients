"use client";

// The keys that open your lists, on this device only. The server stores them wrapped; the password (or recovery
// key) unwraps them here. Unlocked keys live in memory and in IndexedDB as non-extractable CryptoKeys: this
// browser stays unlocked until you sign out, and page scripts can use the keys but never read them out.
import * as C from "@todone/sdk/crypto";
import { api } from "./api";

type Stored = { accountKey: CryptoKey; privateKey: CryptoKey; userId: string };
// Fields are null for an account that has no keys yet (keyState).
type ServerKeys = C.AccountKeys & { hasPassword?: boolean; teamKeys: Record<string, string> };

let held: Stored | null = null;
let teams = new Map<string, CryptoKey>();
let teamsLoaded: Promise<void> | null = null;

// IndexedDB: one object store, one record.
const DB = "todone-vault";
function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore("keys");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction("keys", mode);
      const req = run(tx.objectStore("keys"));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => open.result.close();
    };
  });
}

// The unlocked keys for this signed-in person, from memory or this device's store. null = locked here.
// Without `userId` (opened offline, no session to check) it takes whoever this device was unlocked for.
export async function loadVault(userId?: string): Promise<boolean> {
  if (held && (!userId || held.userId === userId)) return true;
  const s = await idb<Stored | undefined>("readonly", (st) => st.get("me")).catch(() => undefined);
  if (!s || (userId && s.userId !== userId)) return false;
  held = s;
  return true;
}

async function keep(userId: string, accountKey: CryptoKey, keys: { wrappedPrivateKey: string }) {
  // Re-imported non-extractable before it's stored: usable, never exportable.
  const raw = await crypto.subtle.exportKey("raw", accountKey).catch(() => null);
  const stored = raw ? await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]) : accountKey;
  held = { userId, accountKey: stored, privateKey: await C.unwrapPrivateKey(stored, keys.wrappedPrivateKey) };
  teams = new Map();
  teamsLoaded = null;
  await idb("readwrite", (st) => st.put(held, "me")).catch(() => {});
}

export async function lockVault() {
  held = null;
  teams = new Map();
  teamsLoaded = null;
  await idb("readwrite", (st) => st.delete("me")).catch(() => {});
}

export const unlocked = () => !!held;

// Before signing in: this account's salt, or that it predates encryption.
export const prelogin = (email: string) =>
  api<{ salt?: string; iterations?: number; legacy?: boolean }>("POST", "/prelogin", { email });

// Sign-in with the password: the hash to send, and (after the session exists) unlocking with it.
export async function derive(email: string, password: string) {
  const p = await prelogin(email);
  if (p.legacy) return { legacy: true as const };
  return { legacy: false as const, ...(await C.deriveLogin(password, p.salt!, p.iterations)) };
}
export async function unlockWith(userId: string, wrapKey: CryptoKey) {
  const k = await api<ServerKeys>("GET", "/keys");
  let accountKey: CryptoKey;
  try {
    accountKey = await C.unwrapSymmetric(wrapKey, k.wrappedKey);
  } catch {
    throw new Error("That password isn't right.");
  }
  await keep(userId, accountKey, k);
}
// Unlock on a device that lost its keys (the session is still there): the password re-derives them.
export async function unlockWithPassword(userId: string, email: string, password: string) {
  const d = await derive(email, password);
  if (d.legacy) throw new Error("Sign out and sign in again to finish setting up encryption.");
  await unlockWith(userId, d.wrapKey);
}

// Accounts that signed in with Google, GitHub or Discord have no password: an unlock passphrase they choose wraps
// their keys instead, exactly as a password would (it never leaves this device either).
export type KeyState = "setup" | "legacy" | "passphrase" | "password";
export async function keyState(): Promise<KeyState> {
  const k = await api<ServerKeys>("GET", "/keys");
  if (!k.kdfSalt) return k.hasPassword ? "legacy" : "setup";
  return k.hasPassword ? "password" : "passphrase";
}
// First time signed in with Google, GitHub or Discord: keys made here from the chosen passphrase. Returns the
// recovery key to show once.
export async function setupWithPassphrase(userId: string, passphrase: string) {
  const a = await C.newAccount(passphrase);
  await api("POST", "/keys/init", a.keys);
  await keep(userId, a.accountKey, a.keys);
  return a.recoveryKey;
}
// Unlock with the password or passphrase, using this account's own salt.
export async function unlockWithSecret(userId: string, secret: string) {
  const k = await api<ServerKeys>("GET", "/keys");
  const { wrapKey } = await C.deriveLogin(secret, k.kdfSalt, k.kdfIter);
  await unlockWith(userId, wrapKey);
}
// Forgot the passphrase: the recovery key opens the account key, and a new passphrase wraps it again.
export async function recoverPassphrase(userId: string, recoveryKey: string, passphrase: string) {
  const k = await api<ServerKeys>("GET", "/keys");
  const accountKey = await C.unwrapSymmetric(await C.recoveryWrapKey(recoveryKey), k.recoveryWrappedKey, true).catch(() => {
    throw new Error("That recovery key doesn't match this account.");
  });
  const { kdfSalt, kdfIter, wrappedKey } = await C.rewrap(accountKey, passphrase);
  await api("POST", "/keys/passphrase", { kdfSalt, kdfIter, wrappedKey });
  await keep(userId, accountKey, k);
}

// A new account: keys made here; the caller signs up with `authHash` and `keys`, then calls `adopt`.
export const newAccount = (password: string) => C.newAccount(password);
export const adopt = (userId: string, accountKey: CryptoKey, keys: C.AccountKeys) => keep(userId, accountKey, keys);

// An account from before encryption, just signed in with its plain password: make keys, swap the password for
// the hash, then encrypt what it already has (the caller re-saves the lists).
export async function setupLegacy(userId: string, password: string) {
  const a = await C.newAccount(password);
  await api("POST", "/keys/setup", { password, authHash: a.authHash, ...a.keys });
  await keep(userId, a.accountKey, a.keys);
  return a.recoveryKey;
}

// Change password: the account key re-wrapped; nothing else is re-encrypted.
export async function changePassword(email: string, current: string, next: string) {
  const d = await derive(email, current);
  if (d.legacy) throw new Error("Sign in again first.");
  const k = await api<ServerKeys>("GET", "/keys");
  const accountKey = await C.unwrapSymmetric(d.wrapKey, k.wrappedKey, true).catch(() => {
    throw new Error("Your current password isn't right.");
  });
  await api("POST", "/keys/password", { currentAuthHash: d.authHash, ...(await C.rewrap(accountKey, next)) });
}

// The recovery key, shown again after the password is confirmed; or a new one (the old one stops working).
export async function showRecovery(email: string, password: string) {
  const d = await derive(email, password);
  if (d.legacy) throw new Error("Sign in again first.");
  const k = await api<ServerKeys>("GET", "/keys");
  const accountKey = await C.unwrapSymmetric(d.wrapKey, k.wrappedKey).catch(() => {
    throw new Error("That password isn't right.");
  });
  return { recoveryKey: await C.readRecovery(accountKey, k.encryptedRecovery), accountKey, authHash: d.authHash };
}
export async function newRecovery(email: string, password: string) {
  const { accountKey, authHash } = await showRecovery(email, password);
  const r = await C.newRecovery(accountKey);
  await api("POST", "/keys/recovery-key", { currentAuthHash: authHash, ...r });
  return r.recoveryKey;
}

// Forgot password, from the emailed link: with the recovery key, a new password keeps everything.
export async function recover(token: string, recoveryKey: string, password: string) {
  const { recoveryWrappedKey } = await api<{ recoveryWrappedKey: string | null }>("POST", "/keys/recovery", { token });
  if (!recoveryWrappedKey) throw new Error("This account has no recovery key. Use “I don't have it” instead.");
  const wrap = await C.recoveryWrapKey(recoveryKey);
  const accountKey = await C.unwrapSymmetric(wrap, recoveryWrappedKey, true).catch(() => {
    throw new Error("That recovery key doesn't match this account.");
  });
  await api("POST", "/keys/recover", { token, ...(await C.rewrap(accountKey, password)) });
}
// Without it: a fresh start. Encrypted lists can't be opened by anyone, so they're deleted.
export async function resetAccount(token: string, password: string) {
  const a = await C.newAccount(password);
  await api("POST", "/keys/reset-account", { token, authHash: a.authHash, ...a.keys });
  return a.recoveryKey;
}

// Team keys, unwrapped with this person's private key. Missing = not confirmed by a teammate yet.
async function loadTeams() {
  const k = await api<ServerKeys>("GET", "/keys");
  const next = new Map<string, CryptoKey>();
  for (const [org, wrapped] of Object.entries(k.teamKeys ?? {}))
    await C.unwrapTeamKey(held!.privateKey, wrapped)
      .then((key) => next.set(org, key))
      .catch(() => {});
  teams = next;
}
export async function teamKey(org: string, fresh = false) {
  if (!held) throw new Error("Locked");
  if (fresh || !teamsLoaded) teamsLoaded = loadTeams();
  await teamsLoaded;
  return teams.get(org) ?? null;
}

// The key for a workspace's lists: yours, or the team's (null when the team hasn't given it to you yet).
export async function keyFor(org: string | null) {
  if (!held) throw new Error("Locked");
  return org ? teamKey(org) : held.accountKey;
}

// A new team: its key is made here and given to its creator (more members are confirmed later).
export async function startTeam(org: string) {
  if (!held) throw new Error("Locked");
  const key = await C.newSymmetricKey();
  const me = (await api<{ userId: string; publicKey: string | null }[]>("GET", `/orgs/${org}/keys`)).find(
    (m) => m.userId === held!.userId,
  );
  if (!me?.publicKey) throw new Error("Your keys aren't set up yet.");
  await api("PUT", `/orgs/${org}/keys`, { keys: [{ userId: held.userId, wrapped: await C.wrapForMember(me.publicKey, key) }] });
  teams.set(org, key);
}

// Gives the team key to members who joined (wrapped to their public key).
export type Member = { userId: string; name: string; email: string; publicKey: string | null; hasKey: boolean };
export const teamMembers = (org: string) => api<Member[]>("GET", `/orgs/${org}/keys`);
export async function confirmMember(org: string, m: Member) {
  const key = await teamKey(org, true);
  if (!key) throw new Error("You don't have this team's key yet.");
  if (!m.publicKey) throw new Error(`${m.name || m.email} needs to sign in once before they can be confirmed.`);
  await api("PUT", `/orgs/${org}/keys`, { keys: [{ userId: m.userId, wrapped: await C.wrapForMember(m.publicKey, key) }] });
}
export const fingerprint = (publicKey: string) => C.fingerprint(publicKey);
export async function myFingerprint() {
  const k = await api<ServerKeys>("GET", "/keys");
  return k.publicKey ? C.fingerprint(k.publicKey) : null;
}

// The offline copy of your lists in this browser, encrypted with your key.
export async function sealCache(value: unknown) {
  return held ? C.sealJSON(held.accountKey, value, "offline-cache") : null;
}
export async function openCache<T>(blob: string): Promise<T | null> {
  return held ? C.openJSON<T>(held.accountKey, blob, "offline-cache").catch(() => null) : null;
}

export const encryptList = C.encryptList;
export const decryptList = C.decryptList;
