import type { Metadata } from "next";
import { Status } from "./Status";

export const metadata: Metadata = { title: "Status", description: "Is todone up?" };

export default function StatusPage() {
  return <Status />;
}
