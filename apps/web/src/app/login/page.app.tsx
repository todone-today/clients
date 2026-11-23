import type { Metadata } from "next";
import { Suspense } from "react";
import { Login } from "./Login";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
