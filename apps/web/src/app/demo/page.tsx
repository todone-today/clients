import { redirect } from "next/navigation";

// The no-account demo is gone: todone asks people to sign up (free) instead. Old links land on sign-up.
export default function DemoPage() {
  redirect("/app?new=1");
}
