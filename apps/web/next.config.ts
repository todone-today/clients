import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// One codebase, two builds:
// - the website (todone.today, on Vercel): landing pages, docs, and pages shared by link. Its route files are
//   page.tsx, layout.tsx…
// - the app (TARGET=app: app.todone.today, on Fly.io): your lists, as static files Caddy serves next to the API
//   (fly/). Its route files are page.app.tsx, layout.app.tsx, manifest.app.ts, so each build sees only its own.
const app = process.env.TARGET === "app";
const dev = process.env.NODE_ENV !== "production";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.todone.today";
const SERVER = process.env.SERVER_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Shown in Account: the app's version and the commit it was built from.
  env: {
    NEXT_PUBLIC_VERSION: version,
    NEXT_PUBLIC_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_SHA ?? "").slice(0, 7),
    NEXT_PUBLIC_TARGET: app ? "app" : "site",
  },
  pageExtensions: app ? ["app.tsx", "app.ts"] : ["tsx", "ts"],
  ...(app
    ? {
        output: "export" as const,
        distDir: dev ? ".next-app" : "out-app",
        // The website's build type-checks every file, the app's included; here the website's typed routes
        // (/g/[slug]…) don't exist, so its pages would fail a check that has already passed.
        typescript: { ignoreBuildErrors: true },
      }
    : { cacheComponents: true, partialPrefetching: true }),
  skipTrailingSlashRedirect: true, // PostHog's /ingest calls end in a slash
  ...(app
    ? {} // the app's headers are in fly/Caddyfile
    : {
        // Browser hardening for every page: no framing (clickjacking), no MIME sniffing, HTTPS only, a tight
        // referrer, no camera or location, and the microphone only for todone's own pages.
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Frame-Options", value: "DENY" },
                { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" },
              ],
            },
          ];
        },
        // Signing in and the app live at app.todone.today: old links (bookmarks, emails, installed shortcuts) go
        // there, query and all (?plan=, ?goal=&do=, ?new=1).
        async redirects() {
          return [
            { source: "/app", destination: `${APP_URL}/`, permanent: true },
            { source: "/app/:path*", destination: `${APP_URL}/app/:path*`, permanent: true },
            { source: "/login", destination: `${APP_URL}/login`, permanent: true },
            { source: "/reset-password", destination: `${APP_URL}/reset-password`, permanent: true },
            { source: "/invite/:id", destination: `${APP_URL}/invite?id=:id`, permanent: true },
          ];
        },
      }),
  // The todone server answers /api: the website forwards its few calls (status, pricing, shared tasks), and so does
  // the app while developing (in production, Caddy does). PostHog goes through /ingest, so blockers of third-party
  // trackers don't hide whole visits. US cloud.
  ...(app && !dev
    ? {}
    : {
        async rewrites() {
          return [
            { source: "/api/:path*", destination: `${SERVER}/api/:path*` },
            { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
            { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
          ];
        },
      }),
};

export default nextConfig;
