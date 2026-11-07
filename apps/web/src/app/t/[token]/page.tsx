import type { Metadata } from "next";
import { Suspense } from "react";
import { Guest } from "./Guest";

// A task shared by link: no account, not end-to-end encrypted (the owner agreed to that when sharing).
export const metadata: Metadata = { title: "Shared task", robots: { index: false, follow: false } };

export default function SharedTask({ params }: PageProps<"/t/[token]">) {
  return (
    <Suspense>
      <Shared params={params} />
    </Suspense>
  );
}

async function Shared({ params }: { params: Promise<{ token: string }> }) {
  return <Guest token={(await params).token} />;
}
