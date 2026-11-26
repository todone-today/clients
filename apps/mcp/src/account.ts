import * as C from "@todone/sdk/crypto";
import { decryptList, encryptList } from "@todone/sdk/crypto";
import type { List, Task } from "@todone/sdk/tasks";

// The connection code from todone's Account: "tdn_<token>.<secret>". The token signs this computer in; the secret
// stays here and unwraps the account key the browser left on the server wrapped to it.
export function parseCode(code: string) {
  const m = /^(tdn_[A-Za-z0-9_-]{32,64})\.([A-Za-z0-9_-]{43})$/.exec(code.trim());
  if (!m) throw new Error("TODONE_CONNECT doesn't look right. Copy it again from todone: Account → Connect an AI.");
  return { token: m[1], secret: m[2] };
}
const fromB64url = (s: string) => Uint8Array.from(Buffer.from(s, "base64url"));

type Stored = List & { data?: string };
type Keys = { wrappedPrivateKey: string; teamKeys: Record<string, string> };
export type Workspace = string; // "personal" or a team's id

// One signed-in, unlocked account: reads and saves its lists the way the app does, encrypted on the way out and
// decrypted on the way in. A list switched to plain (encryption off) goes as it is.
export class Account {
  user = "";
  name = "";
  private accountKey!: CryptoKey;
  private privateKey!: CryptoKey;
  private teams = new Map<string, CryptoKey | null>();
  private url: string;
  private code: { token: string; secret: string };
  constructor(url: string, code: { token: string; secret: string }) {
    this.url = url;
    this.code = code;
  }

  async call<T>(method: string, path: string, body?: unknown, ws: Workspace = "personal"): Promise<T> {
    const r = await fetch(`${this.url}/api${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.code.token}`,
        "x-todone-workspace": ws,
        // Always JSON when it writes: the server refuses body-less writes that look like a cross-site form.
        ...(method === "GET" ? {} : { "content-type": "application/json" }),
      },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
    const j = (await r.json().catch(() => null)) as { error?: string } | null;
    if (!r.ok) throw new Error(j?.error ?? `todone answered ${r.status}`);
    return j as T;
  }

  async unlock() {
    const self = await this.call<{ name: string; wrappedKey: string; user: string }>("GET", "/connectors/self");
    const wrap = await crypto.subtle.importKey("raw", fromB64url(this.code.secret), "AES-GCM", false, ["encrypt", "decrypt"]);
    this.accountKey = await C.unwrapSymmetric(wrap, self.wrappedKey).catch(() => {
      throw new Error("This connection code can't open your lists. Make a new one in todone's Account.");
    });
    const keys = await this.call<Keys>("GET", "/keys");
    this.privateKey = await C.unwrapPrivateKey(this.accountKey, keys.wrappedPrivateKey);
    for (const [org, wrapped] of Object.entries(keys.teamKeys ?? {}))
      this.teams.set(org, await C.unwrapTeamKey(this.privateKey, wrapped).catch(() => null));
    this.user = self.user;
    this.name = self.name;
  }

  private key(ws: Workspace) {
    if (ws === "personal") return this.accountKey;
    const k = this.teams.get(ws);
    if (!k) throw new Error("A teammate needs to confirm you in that team before its lists can be opened.");
    return k;
  }

  private async open(l: Stored, ws: Workspace): Promise<List | null> {
    if (!l.data) return { ...l, plain: true };
    try {
      const { name, tasks, icon } = await decryptList<Task[]>(this.key(ws), l.id, l.data);
      const rest: Stored = { ...l };
      delete rest.data;
      return { ...rest, name, tasks, ...(icon ? { icon } : {}) };
    } catch {
      return null;
    }
  }
  private async body(ws: Workspace, l: Pick<List, "id" | "name" | "tasks" | "icon" | "plain">) {
    if (l.plain) return { name: l.name, tasks: l.tasks, icon: l.icon };
    return { data: await encryptList(this.key(ws), l.id, { name: l.name, tasks: l.tasks, icon: l.icon }) };
  }

  async lists(ws: Workspace = "personal"): Promise<List[]> {
    const rows = await this.call<Stored[]>("GET", "/lists", undefined, ws);
    const opened = await Promise.all(rows.map((r) => this.open(r, ws)));
    return opened.filter((l): l is List => !!l).sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9));
  }

  async create(ws: Workspace, l: { id: string; name: string; tasks: unknown[]; kind?: List["kind"]; plain?: boolean }) {
    const stored = await this.call<Stored>(
      "POST",
      "/lists",
      { id: l.id, kind: l.kind ?? "list", ...(await this.body(ws, l as List)) },
      ws,
    );
    return (await this.open(stored, ws))!;
  }

  // Changes one list from what's saved now; if someone saved in between (the app, another AI), it reads again
  // and redoes the change, so nobody's edit is overwritten. `f` returning null deletes the list.
  async change(ws: Workspace, id: string, f: (l: List) => List | null): Promise<List | null> {
    for (let tries = 0; tries < 4; tries++) {
      const base = (await this.lists(ws)).find((l) => l.id === id);
      if (!base) throw new Error("That list isn't there any more.");
      const next = f(base);
      if (!next) {
        await this.call("DELETE", `/lists/${encodeURIComponent(id)}`, undefined, ws);
        return null;
      }
      const r = await this.call<{ ok: boolean; list: Stored | null }>(
        "PUT",
        `/lists/${encodeURIComponent(id)}`,
        { version: base.version, ...(await this.body(ws, next)) },
        ws,
      );
      if (r.ok && r.list) return this.open(r.list, ws);
    }
    throw new Error("The list kept changing while saving. Try again.");
  }
}
