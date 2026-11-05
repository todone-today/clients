import Link from "next/link";
import { Logo } from "@/components/Logo";
import s from "../(legal)/legal.module.css";

// The guide, changelog and status pages: the same quiet reading layout as the policies.
const PAGES = [
  ["/docs", "Guide"],
  ["/changelog", "Changelog"],
  ["/status", "Status"],
  ["/demo", "Try the demo"],
] as const;

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.page}>
      <header className={s.head}>
        <Link href="/" aria-label="todone home" className={s.mark}>
          <Logo size={26} />
        </Link>
        <nav aria-label="Pages" className={s.nav}>
          {PAGES.map(([href, name]) => (
            <Link key={href} href={href}>
              {name}
            </Link>
          ))}
        </nav>
      </header>
      <main className={s.doc}>{children}</main>
    </div>
  );
}
