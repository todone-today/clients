import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The todone server answers /api. Forwarding it keeps one address for the browser: the session cookie,
  // OAuth callbacks, calendar and Markdown links all live on this site.
  // Browser hardening for every page: no framing (clickjacking), no MIME sniffing, HTTPS only, a tight referrer,
  // and no camera, microphone or location.
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.SERVER_URL ?? "http://localhost:4000"}/api/:path*` }];
  },
};

export default nextConfig;
