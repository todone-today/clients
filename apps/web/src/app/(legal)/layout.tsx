import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LEGAL_DOCS, LEGAL_UPDATED } from "@/lib/brand";
import s from "./legal.module.css";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.page}>
      <header className={s.head}>
        <Link href="/" aria-label="todone home" className={s.mark}>
          <Logo size={26} />
        </Link>
        <nav aria-label="Policies" className={s.nav}>
          {LEGAL_DOCS.map(([href, name]) => (
            <Link key={href} href={href}>
              {name}
            </Link>
          ))}
        </nav>
      </header>
      <main className={s.doc}>
        {children}
        <p className={s.updated}>Last updated {LEGAL_UPDATED}.</p>
      </main>
    </div>
  );
}
