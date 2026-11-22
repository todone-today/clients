// How todone is used, counted, for making it better (docs/events.md in the server repo lists every event).
// Names and counts only: never a task, list or goal name, a note, an email or a user id. Lists are end-to-end
// encrypted and nothing here weakens that. One random id per visit (kept in memory, gone on reload), so PostHog sees
// totals and how a visit went, never a person across visits. Off without NEXT_PUBLIC_POSTHOG_KEY.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const visit = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());

export type UsageEvent =
  | { name: "task_created"; via: "typed" | "ask" | "idea"; n?: number }
  | { name: "task_done" }
  | { name: "list_created" }
  | { name: "ask_used"; via: "typed" | "voice" }
  // Share cards (the card's kind, and whether it went to the share sheet or was saved: never what's on it).
  | { name: "share_sheet_opened"; kind: "win" | "progress" | "recap" }
  | { name: "share_card_exported"; kind: "win" | "progress" | "recap"; via: "share" | "save" }
  | { name: "goal_link_made"; mode: "view" | "challenge" }
  | { name: "goal_link_used"; what: "join" | "clone"; ok: boolean };

export function usage({ name, ...props }: UsageEvent) {
  if (!KEY || typeof window === "undefined") return;
  // Through our own address (next.config rewrites /ingest), without cookies: the session never goes to PostHog.
  fetch("/ingest/i/v0/e/", {
    method: "POST",
    credentials: "omit",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: KEY,
      event: name,
      distinct_id: visit,
      properties: { ...props, $process_person_profile: false, source: "app" },
    }),
  }).catch(() => {}); // an analytics hiccup never bothers anyone
}
