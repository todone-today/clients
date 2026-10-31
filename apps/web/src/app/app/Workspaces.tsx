"use client";

import { useState } from "react";
import { Copy, Plug, Plus, Trash2, UserMinus, Users } from "lucide-react";
import { Select } from "@/components/Select";
import { authClient } from "@/lib/auth-client";
import s from "./app.module.css";

const org = authClient.organization;
export type Panel = "calendar" | "ideas" | "members" | "integrations" | "account" | null;

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
      <span className={s.sideHead} aria-hidden>
        Workspace
      </span>
      <Select
        label="Workspace"
        value={orgId ?? ""}
        options={[{ value: "", label: "Personal" }, ...(orgs ?? []).map((o) => ({ value: o.id, label: o.name }))]}
        onChange={async (v) => {
          onSwitch();
          await org.setActive({ organizationId: v || null });
        }}
      />
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
        data-tour="integrations"
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
          <Select
            className={s.roleSelect}
            label="Role"
            value={role}
            options={[
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
            ]}
            onChange={(v) => setRole(v as "member" | "admin")}
          />
          <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties}>
            Invite
          </button>
        </form>
      )}

      <ul className={s.people}>
        {o.members.map((m) => (
          <li key={m.id} className={s.person}>
            <span className={s.avatar} aria-hidden>
              {(m.user.name || m.user.email).slice(0, 1).toUpperCase()}
            </span>
            <span className={s.who}>
              <b>
                {m.user.name}
                {m.id === me.id ? " (you)" : ""}
              </b>
              <span>{m.user.email}</span>
            </span>
            <span className={s.roleTag} data-role={m.role}>
              {m.role}
            </span>
            {m.id === me.id
              ? // The only owner can't leave; they delete the team instead.
                (m.role !== "owner" || o.members.filter((x) => x.role === "owner").length > 1) && (
                  <button className={`${s.ghost} ${s.danger}`} onClick={() => run(org.leave({ organizationId: o.id }))}>
                    <UserMinus size={16} strokeWidth={2.5} /> Leave
                  </button>
                )
              : manager &&
                m.role !== "owner" && (
                  <button
                    className={`${s.ghost} ${s.danger}`}
                    onClick={() => run(org.removeMember({ memberIdOrEmail: m.id }))}
                  >
                    <UserMinus size={16} strokeWidth={2.5} /> Remove
                  </button>
                )}
          </li>
        ))}
        {manager &&
          o.invitations
            .filter((i) => i.status === "pending")
            .map((i) => (
              <li key={i.id} className={s.person} data-pending>
                <span className={s.avatar} aria-hidden>
                  {i.email.slice(0, 1).toUpperCase()}
                </span>
                <span className={s.who}>
                  <b>{i.email}</b>
                  <span>Invited, not joined yet. Send them the link.</span>
                </span>
                <span className={s.roleTag} data-role={i.role}>
                  {i.role}
                </span>
                <span className={s.tools}>
                  <button className={s.ghost} onClick={() => navigator.clipboard.writeText(link(i.id))}>
                    <Copy size={16} strokeWidth={2.5} /> Copy link
                  </button>
                  <button
                    className={`${s.ghost} ${s.danger}`}
                    onClick={() => run(org.cancelInvitation({ invitationId: i.id }))}
                  >
                    Cancel
                  </button>
                </span>
              </li>
            ))}
      </ul>

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
