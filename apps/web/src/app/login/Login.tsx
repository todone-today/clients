"use client";

import { useEffect, useState } from "react";
import type { Config } from "@todone/sdk/api";
import { pickHaiku } from "@/lib/haiku";
import { LoginForm } from "./LoginForm";

// The app's sign-in page. It asks the server which sign-ins it offers (so new keys need no rebuild), then shows the
// form; a fresh haiku per visit.
export function Login() {
  const [config, setConfig] = useState<(Config & { discord?: boolean }) | null>(null);
  const [haiku] = useState(pickHaiku);
  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({ github: false, google: false, verifiesEmail: false }))
      .then(setConfig);
  }, []);
  if (!config) return null;
  const social = (["google", "github", "discord"] as const).filter((p) => config[p]);
  return <LoginForm canReset={!!config.verifiesEmail} haiku={haiku} social={social} />;
}
