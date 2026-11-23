"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SITE, TARGET } from "@/lib/urls";
import s from "./login.module.css";

// Sign-in as a pop-up: on the app (app.todone.today) over a wall of stickers, and closing it, with ×, Esc or a click
// outside, goes back to the website (todone.today); there's nothing of the app to see before signing in. `locked`: it can't be closed (the recovery key, until it's saved).
// `page` instead: the same card on a plain page.
export function AuthShell({ children, page, locked }: { children: React.ReactNode; page?: boolean; locked?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!page && !ref.current?.open) ref.current?.showModal();
  }, [page]);
  if (page)
    return (
      <main className={s.page}>
        <Link href={TARGET === "app" ? SITE : "/"} className={s.mark} aria-label="Home">
          <Logo size={34} />
        </Link>
        {children}
      </main>
    );
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-label="Sign in"
      onClose={() => (TARGET === "app" ? location.assign(SITE) : router.push("/"))}
      onCancel={(e) => locked && e.preventDefault()}
      onClick={(e) => !locked && e.target === e.currentTarget && ref.current?.close()}
    >
      <div className={s.dialogBody}>
        {!locked && (
          <button className={s.closeX} onClick={() => ref.current?.close()} aria-label="Close">
            <X size={20} strokeWidth={2.75} aria-hidden />
          </button>
        )}
        {children}
      </div>
    </dialog>
  );
}
