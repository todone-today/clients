import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import { NAME } from "@/lib/brand";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-display", subsets: ["latin"], weight: ["800", "900"] });
const sans = Schibsted_Grotesk({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${NAME}: lists that get done`, template: `%s · ${NAME}` },
  description:
    "An open-source todo app for the web and the terminal. Subtasks, due dates, estimates, a calendar and a focus timer, stored as plain Markdown you own.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
    { media: "(prefers-color-scheme: light)", color: "#fff8ef" },
  ],
};

// Applies the saved Day/Night choice before paint, so the page never flashes the other theme.
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

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
