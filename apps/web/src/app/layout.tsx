import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import { NAME } from "@/lib/brand";
import { SITE } from "@/lib/urls";
import { Visits } from "@/components/Visits";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-display", subsets: ["latin"], weight: ["800", "900"] });
const sans = Schibsted_Grotesk({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

const DESCRIPTION =
  "Sticky-note to-dos, a calendar, goals and Ask todone, which turns your day into tasks in any language. End-to-end encrypted, and it works offline.";

// The website's metadata: what search engines and link previews read. Every page sets its own canonical address
// (alternates.canonical), so a page reached with ?ref= or the like still counts as one page.
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: `${NAME} · To-do lists, calendar and goals`, template: `%s · ${NAME}` },
  description: DESCRIPTION,
  applicationName: NAME,
  category: "productivity",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: NAME,
    url: "/",
    title: `${NAME} · Todos. Done right.`,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: `${NAME} · Todos. Done right.`, description: DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  // Added to an iPhone's Home Screen it opens as its own app, named todone (the icon is app/apple-icon.png).
  appleWebApp: { capable: true, title: NAME },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
    { media: "(prefers-color-scheme: light)", color: "#fff8ef" },
  ],
};

// Applies the saved Day/Night choice before paint, so the page never flashes the other theme. A task shared by
// link (/t/…) is always Day for the people it's shared with.
const themeScript = `try{var t=location.pathname.indexOf("/t/")===0?"day":localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Visits />
      </body>
    </html>
  );
}
