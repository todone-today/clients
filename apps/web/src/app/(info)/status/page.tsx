import type { Metadata } from "next";
import { Suspense } from "react";
import { History } from "./History";
import { Status } from "./Status";

export const metadata: Metadata = { title: "Status", description: "Is todone up?" };

export default function StatusPage() {
  return (
    <>
      <Status />
      <Suspense fallback={null}>
        <History />
      </Suspense>
    </>
  );
}
