"use client";

import { useEffect, useState } from "react";
import type { Config } from "@todone/sdk/api";
import { LoginForm } from "./LoginForm";
import s from "./login.module.css";

// The app's sign-in page. It asks the server which sign-ins it offers (so new keys need no rebuild), then shows the
// form, over a wall of stickers.
export function Login() {
  const [config, setConfig] = useState<(Config & { discord?: boolean }) | null>(null);
  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({ github: false, google: false, verifiesEmail: false }))
      .then(setConfig);
  }, []);
  const social = (["google", "github", "discord"] as const).filter((p) => config?.[p]);
  return (
    <>
      <div className={s.wall} aria-hidden />
      {config && <LoginForm canReset={!!config.verifiesEmail} social={social} />}
    </>
  );
}
