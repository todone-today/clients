"use client";

import { useState } from "react";
import { Copy, Plug, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import s from "./app.module.css";

const org = authClient.organization;
export type Panel = "calendar" | "ideas" | "members" | "integrations" | null;

// Personal lists or a team's; switching changes which lists the server returns.
export function Workspaces({
  orgId,
  panel,
  onPanel,
  onSwitch,
}: {
  orgId: string | null;
  panel: Panel;
  onPanel: (p: Panel) => void;
  onSwitch: () => void;
}) {
  const { data: orgs } = authClient.useListOrganizations();
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  return (
    <div className={s.workspace}>
      <label className={s.sideHead} htmlFor="workspace">
        Workspace
      </label>
      <select
        id="workspace"
        value={orgId ?? ""}
        onChange={async (e) => {
          onSwitch();
          await org.setActive({ organizationId: e.target.value || null });
        }}
      >
        <option value="">Personal</option>
        {orgs?.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {orgId && (
        <button
          className={s.ghost}
          aria-pressed={panel === "members"}
          onClick={() => onPanel(panel === "members" ? null : "members")}
        >
          <Users size={16} strokeWidth={2.5} /> Members
        </button>
      )}
      <button
        className={s.ghost}
        aria-pressed={panel === "integrations"}
        onClick={() => onPanel(panel === "integrations" ? null : "integrations")}
      >
        <Plug size={16} strokeWidth={2.5} /> Integrations
      </button>
      <form
        className={s.newList}
        onSubmit={async (e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) return;
          const slug = `${n
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 40)}-${crypto.randomUUID().slice(0, 6)}`;
          onSwitch();
          const r = await org.create({ name: n, slug });
          setErr(r.error?.message ?? "");
          if (!r.error) setName("");
        }}
      >
        <label className="sr-only" htmlFor="new-team">
          New team
        </label>
        <input id="new-team" value={name} onChange={(e) => setName(e.target.value)} placeholder="New team" maxLength={60} />
        <button aria-label="Create team" disabled={!name.trim()}>
          <Plus size={18} strokeWidth={2.5} />
        </button>
        {err && <p className={s.err}>{err}</p>}
      </form>
    </div>
  );
}

export function Members() {
  const { data: o, refetch } = authClient.useActiveOrganization();
  const { data: me } = authClient.useActiveMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [msg, setMsg] = useState("");
  if (!o || !me) return null;
  const manager = me.role === "owner" || me.role === "admin";
  const link = (id: string) => `${location.origin}/invite/${id}`;
  const run = async (p: Promise<{ error: { message?: string } | null }>) => {
    const r = await p;
    setMsg(r.error?.message ?? "");
    refetch();
    return !r.error;
  };

  return (
    <>
      <div className={s.listHead}>
        <h1 className={`display ${s.title}`}>{o.name}</h1>
        <p className={s.progress}>
          {o.members.length} member{o.members.length === 1 ? "" : "s"} · you are {me.role}
        </p>
        {msg && <p className={s.err}>{msg}</p>}
      </div>

      {manager && (
        <form
          className={s.add}
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(org.inviteMember({ email: email.trim(), role }))) setEmail("");
          }}
        >
          <label className="sr-only" htmlFor="invite-email">
            Invite by email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
          />
          <label className="sr-only" htmlFor="invite-role">
            Role
          </label>
          <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")}>
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
            Invite
          </button>
        </form>
      )}

      <ul className={s.tasks}>
        {o.members.map((m) => (
          <li key={m.id} className={s.taskItem}>
            <div className={s.row}>
              <span className={s.open}>{m.role}</span>
              <span className={s.taskTitle}>
                {m.user.name} <span className={s.open}>{m.user.email}</span>
              </span>
              {m.id === me.id ? (
                <button className={`${s.ghost} ${s.danger}`} onClick={() => run(org.leave({ organizationId: o.id }))}>
                  <UserMinus size={16} strokeWidth={2.5} /> Leave
                </button>
              ) : (
                manager &&
                m.role !== "owner" && (
                  <button
                    className={`${s.ghost} ${s.danger}`}
                    onClick={() => run(org.removeMember({ memberIdOrEmail: m.id }))}
                  >
                    <UserMinus size={16} strokeWidth={2.5} /> Remove
                  </button>
                )
              )}
            </div>
          </li>
        ))}
      </ul>

      {manager && o.invitations.some((i) => i.status === "pending") && (
        <>
          <h2 className={s.sideHead} style={{ marginTop: "2rem" }}>
            Pending invites · send them the link
          </h2>
          <ul className={s.tasks}>
            {o.invitations
              .filter((i) => i.status === "pending")
              .map((i) => (
                <li key={i.id} className={s.taskItem}>
                  <div className={s.row}>
                    <span className={s.open}>{i.role}</span>
                    <span className={s.taskTitle}>{i.email}</span>
                    <span className={s.tools}>
                      <button className={s.ghost} onClick={() => navigator.clipboard.writeText(link(i.id))}>
                        <Copy size={16} strokeWidth={2.5} /> Copy link
                      </button>
                      <button
                        className={`${s.ghost} ${s.danger}`}
                        onClick={() => run(org.cancelInvitation({ invitationId: i.id }))}
                      >
                        <Trash2 size={16} strokeWidth={2.5} /> Cancel
                      </button>
                    </span>
                  </div>
                </li>
              ))}
          </ul>
        </>
      )}

      {me.role === "owner" && <DeleteTeam id={o.id} />}
    </>
  );
}

function DeleteTeam({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <p style={{ marginTop: "3rem" }}>
      <button
        className={`${s.ghost} ${s.danger}`}
        onClick={() => (armed ? org.delete({ organizationId: id }) : setArmed(true))}
        onBlur={() => setArmed(false)}
      >
        <Trash2 size={16} strokeWidth={2.5} /> {armed ? "Click again: deletes the team and its lists" : "Delete team"}
      </button>
    </p>
  );
}
