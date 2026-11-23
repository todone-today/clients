import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

// Reports go through our own address, so ad blockers don't drop them: the website's /monitoring route
// (app/monitoring/route.ts), or in the app the server's /api/monitoring.
Sentry.init({ ...sentryOptions, tunnel: process.env.NEXT_PUBLIC_TARGET === "app" ? "/api/monitoring" : "/monitoring" });
