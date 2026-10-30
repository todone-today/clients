import type { Metadata } from "next";
import { Suspense } from "react";
import { Accept } from "./Accept";

export const metadata: Metadata = { title: "Join a team" };

export default function InvitePage() {
  return (
    <Suspense>
      <Accept />
    </Suspense>
  );
}
