import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import { NAME } from "@/lib/brand";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-display", subsets: ["latin"], weight: ["800", "900"] });
const sans = Schibsted_Grotesk({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${NAME} · Todos. Done right.`, template: `%s · ${NAME}` },
  description:
    "Sticky-note to-dos, a calendar, goals and Ask todone, which turns your day into tasks in any language. End-to-end encrypted, and it works offline.",
  // Added to an iPhone's Home Screen it opens as its own app, named todone (the icon is app/apple-icon.png).
  appleWebApp: { capable: true, title: NAME },
  robots: { index: false, follow: false }, // the website (todone.today) is what search engines should find
  // The app on a phone's home screen (public/manifest.webmanifest), which iOS needs before it allows push.
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
    { media: "(prefers-color-scheme: light)", color: "#fff8ef" },
  ],
};

// The app's root (app.todone.today, built with TARGET=app; the website's is layout.tsx). No page-count script here:
// that's Vercel's, and the app isn't on Vercel.

// Applies the saved colours before paint, so the page never flashes the other theme. A task shared by
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
      </body>
    </html>
  );
}
