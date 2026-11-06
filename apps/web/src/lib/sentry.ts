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
  beforeSend(event: ErrorEvent) {
    delete event.request;
    delete event.user;
    return event;
  },
};
