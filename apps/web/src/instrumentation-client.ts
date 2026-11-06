import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

// Reports go through our own /monitoring route (app/monitoring/route.ts), so ad blockers don't drop them.
Sentry.init({ ...sentryOptions, tunnel: "/monitoring" });
