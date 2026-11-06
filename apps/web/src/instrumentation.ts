import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

export function register() {
  Sentry.init(sentryOptions);
}

// Errors while rendering pages on the server.
export const onRequestError = Sentry.captureRequestError;
