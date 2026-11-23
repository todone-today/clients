// Shared Sentry settings for the browser and the Next server. Off unless NEXT_PUBLIC_SENTRY_DSN is set.
// Nothing personal leaves: no request or user, no IPs, no breadcrumbs (page URLs can hold calendar, invite and
// password-reset tokens), no session replay.
import type { ErrorEvent } from "@sentry/nextjs";

export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeBreadcrumb: () => null,
  // Not our code: Microsoft's email link scanners (Outlook Safe Links, Bing) opening our links; a dropped connection
  // ("Load failed" in Safari), which the request's own code already tells the person about; wallet extensions
  // (MetaMask) that inject scripts into every page and report their own failures.
  ignoreErrors: [
    /Object Not Found Matching Id/,
    /^(TypeError: )?(Load failed|Failed to fetch|NetworkError when attempting to fetch resource)/,
    /MetaMask/,
  ],
  denyUrls: [/^(chrome|moz|safari(-web)?)-extension:\/\//, /\/scripts\/inpage\.js/],
  beforeSend(event: ErrorEvent) {
    delete event.request;
    delete event.user;
    return event;
  },
};
