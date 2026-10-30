"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import s from "../../login/login.module.css";

export function Accept() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [invite, setInvite] = useState<{ organizationName: string; email: string } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!session) return;
    authClient.organization.getInvitation({ query: { id } }).then((r) => {
      if (r.error) setErr(r.error.message ?? "This invite is not valid.");
      else setInvite(r.data);
    });
  }, [id, session]);

  const signIn = `/login?next=${encodeURIComponent(`/invite/${id}`)}`;
  return (
    <main className={s.page}>
      <div className={`sticker ${s.card}`}>
        {isPending ? null : !session ? (
          <>
            <h1 className="display">You&apos;re invited</h1>
            <p>Sign in or make an account with the email the invite was sent to.</p>
            <Link className="btn" href={signIn}>
              Sign in to accept
            </Link>
          </>
        ) : err ? (
          <>
            <h1 className="display">Can&apos;t join</h1>
            <p className={s.err}>{err}</p>
            <p>Invites only work for the email they were made for (you are {session.user.email}).</p>
          </>
        ) : invite ? (
          <>
            <h1 className="display">Join {invite.organizationName}</h1>
            <button
              className="btn"
              style={{ "--fill": "var(--lime)" } as React.CSSProperties}
              onClick={async () => {
                const r = await authClient.organization.acceptInvitation({ invitationId: id });
                if (r.error) return setErr(r.error.message ?? "Couldn't join.");
                await authClient.organization.setActive({ organizationId: r.data.invitation.organizationId });
                router.replace("/app");
              }}
            >
              Accept and open lists
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}
