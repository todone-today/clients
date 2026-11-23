import type { MetadataRoute } from "next";
import { SITE } from "@/lib/urls";

// The website's pages for search engines. Pages shared by link (/g, /t, /calendar) are private-ish and left out
// (robots.ts keeps them unindexed); the app lives at app.todone.today and isn't indexed at all.
const PAGES: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
  ["/", 1, "weekly"],
  ["/docs", 0.8, "monthly"],
  ["/install", 0.7, "monthly"],
  ["/changelog", 0.6, "weekly"],
  ["/status", 0.3, "daily"],
  ["/privacy", 0.3, "yearly"],
  ["/terms", 0.3, "yearly"],
  ["/refunds", 0.3, "yearly"],
  ["/cookies", 0.2, "yearly"],
  ["/acceptable-use", 0.2, "yearly"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(([path, priority, changeFrequency]) => ({ url: `${SITE}${path}`, priority, changeFrequency }));
}
