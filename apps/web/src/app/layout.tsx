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
    "An open-source todo app: sticky notes you drag onto a day, a calendar to plan the week, and teams to share it with. Works offline.",
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
      <body>{children}</body>
    </html>
  );
}
