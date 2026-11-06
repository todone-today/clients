"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Logo } from "@/components/Logo";
import s from "./login.module.css";

// Sign-in as a pop-up over the landing page (the page behind is the real homepage). Closing it, with ×, Esc or a
// click outside, goes back to the homepage. `locked`: it can't be closed (the recovery key, until it's saved).
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
        <Link href="/" className={s.mark} aria-label="Home">
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
      onClose={() => router.push("/")}
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
