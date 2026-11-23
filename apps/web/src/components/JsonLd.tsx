import { NAME, REPO } from "@/lib/brand";
import { PLANS } from "@/lib/landing";
import { SITE } from "@/lib/urls";

// What the homepage is, for search engines (schema.org): the organisation, the website, and the app with its plans'
// prices (from lib/landing.ts, so they never drift). No ratings: there aren't any to show yet.
const rupees = (s: string) => Number(s.replace(/[^\d.]/g, ""));

export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${SITE}/#org`, name: NAME, url: SITE, logo: `${SITE}/icon-512.png`, sameAs: [REPO] },
      { "@type": "WebSite", "@id": `${SITE}/#site`, name: NAME, url: SITE, publisher: { "@id": `${SITE}/#org` } },
      {
        "@type": "SoftwareApplication",
        name: NAME,
        url: SITE,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android, iOS, Windows, macOS",
        description:
          "Sticky-note to-do lists, a calendar, goals and Ask todone, which turns your day into tasks in any language. End-to-end encrypted, and it works offline.",
        publisher: { "@id": `${SITE}/#org` },
        offers: PLANS.map((p) => ({
          "@type": "Offer",
          name: p.name,
          price: p.price ? rupees(p.price.month[0]) : 0,
          priceCurrency: "INR",
          url: `${SITE}/#pricing`,
        })),
      },
    ],
  };
  // JSON in a script tag: "<" escaped so a name can never close the tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
