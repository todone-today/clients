// todone lives at two addresses: the website (todone.today: the landing pages, docs, and pages shared by link) and
// the app (app.todone.today: your lists, and its API). Each links to the other with these.
export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://todone.today";
export const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.todone.today";
// Which one this build is (next.config.ts): "app" is the static app, "site" the website.
export const TARGET = process.env.NEXT_PUBLIC_TARGET === "app" ? "app" : "site";
