import type { MetadataRoute } from "next";
import { SITE } from "@/lib/urls";

// Everything on the website may be indexed except pages shared by link (they also say noindex themselves) and the
// plumbing; the sitemap lists the rest.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/g/", "/t/", "/calendar/", "/api/", "/ingest/", "/monitoring"] },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
