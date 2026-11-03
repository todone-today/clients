import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Config } from "@todone/sdk/api";
import { server } from "@/lib/server";
import { pickHaiku } from "@/lib/haiku";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

// Asks the server which sign-ins it offers, at request time, so it picks up GitHub keys without a rebuild.
async function Login() {
  await connection();
  const config: Config = await fetch(`${server()}/api/config`, { cache: "no-store" })
    .then((r) => r.json())
    .catch(() => ({ github: false, google: false }));
  // A fresh haiku per visit, picked here so server and browser agree on it.
  return <LoginForm github={config.github} haiku={pickHaiku()} />;
}
