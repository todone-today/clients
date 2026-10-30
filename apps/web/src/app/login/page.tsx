import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { hasGithub } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

// Read at request time so a self-hosted server picks up GitHub keys without a rebuild.
async function Login() {
  await connection();
  return <LoginForm github={hasGithub} />;
}
