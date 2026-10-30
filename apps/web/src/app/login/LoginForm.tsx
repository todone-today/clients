"use client";

import Link from "next/link";
import { useState } from "react";
import { GithubMark } from "@/components/GithubMark";
import { NAME } from "@/lib/brand";
import { authClient } from "@/lib/auth-client";
import s from "./login.module.css";

// Only same-site paths, so the login page can't be used to bounce people elsewhere.
const safeNext = () => {
  const n = new URLSearchParams(location.search).get("next") ?? "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/app";
};

export function LoginForm({ github }: { github: boolean }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className={s.page}>
      <Link href="/" className={`display ${s.mark}`}>
        {NAME}
      </Link>
      <form
        className={`sticker ${s.card}`}
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const email = String(f.get("email")).trim();
          const password = String(f.get("password"));
          setBusy(true);
          const r =
            mode === "in"
              ? await authClient.signIn.email({ email, password })
              : await authClient.signUp.email({
                  email,
                  password,
                  name: String(f.get("name")).trim() || email.split("@")[0],
                });
          setBusy(false);
          if (r.error) return setErr(r.error.message ?? "That didn't work. Try again.");
          location.assign(safeNext());
        }}
      >
        <h1 className="display">{mode === "in" ? "Welcome back" : "Make an account"}</h1>
        {mode === "up" && (
          <label>
            <span>Name</span>
            <input name="name" autoComplete="name" maxLength={80} />
          </label>
        )}
        <label>
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          <span>Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
        </label>
        {err && (
          <p className={s.err} role="alert">
            {err}
          </p>
        )}
        <button className="btn" style={{ "--fill": "var(--lime)" } as React.CSSProperties} disabled={busy}>
          {mode === "in" ? "Sign in" : "Sign up"}
        </button>
        {github && (
          <button
            type="button"
            className="btn"
            onClick={() => authClient.signIn.social({ provider: "github", callbackURL: safeNext() })}
          >
            <GithubMark /> Continue with GitHub
          </button>
        )}
        <button
          type="button"
          className={s.switch}
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setErr("");
          }}
        >
          {mode === "in" ? "New here? Make an account" : "Have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
