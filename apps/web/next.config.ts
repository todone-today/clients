import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  skipTrailingSlashRedirect: true, // PostHog's /ingest calls end in a slash
  // The todone server answers /api. Forwarding it keeps one address for the browser: the session cookie,
  // OAuth callbacks, calendar and Markdown links all live on this site.
  // Browser hardening for every page: no framing (clickjacking), no MIME sniffing, HTTPS only, a tight referrer,
  // no camera or location, and the microphone only for todone's own pages (Ask todone's voice), never embedded sites.
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
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${process.env.SERVER_URL ?? "http://localhost:4000"}/api/:path*` },
      // PostHog (the landing page's journey, components/Journey.tsx) through our own address, so blockers of
      // third-party trackers don't hide whole visits. US cloud.
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
};

export default nextConfig;
