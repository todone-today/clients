import type { Metadata } from "next";
import { Suspense } from "react";
import { Receipt } from "./Receipt";

export const metadata: Metadata = { title: "Receipt" };

export default function ReceiptPage() {
  return (
    <Suspense>
      <Receipt />
    </Suspense>
  );
}
