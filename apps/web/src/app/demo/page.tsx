import { redirect } from "next/navigation";
import { APP } from "@/lib/urls";

// The no-account demo is gone: todone asks people to sign up (free) instead. Old links land on sign-up.
export default function DemoPage() {
  redirect(`${APP}/?new=1`);
}
