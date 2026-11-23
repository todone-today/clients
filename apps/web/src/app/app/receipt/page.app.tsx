import type { Metadata } from "next";
import { Suspense } from "react";
import { Receipt } from "./Receipt";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };

// /app/receipt?id=…: one payment's printable receipt.
export default function ReceiptPage() {
  return (
    <Suspense>
      <Receipt />
    </Suspense>
  );
}
