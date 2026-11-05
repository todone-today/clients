# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Repos by concern, Bitwarden-style, in the todone-today GitHub org: `clients` (`apps/web`, Next.js App Router, deployed on Vercel at todone.today), `server` (Hono API, Postgres), `sdk` (shared logic) and `contributing-docs`. The terminal app is retired (tag `tui-final` in the archived 1stdevfriend/todone).

## Users

People and small teams (households included) who want a calm, fast todo list they can see and move around: sticky notes, a calendar, shared workspaces. Many are in India; the rest anywhere.

## Product Purpose

Lists of tasks as sticky notes with steps, due dates and times, estimates, priority and repeats; a day/week/month/year calendar; Brainstorm for loose ideas; teams. It connects third-party services (Google Calendar, Notion, Discord, a calendar feed, Markdown sync for Obsidian) and stores tasks in the Obsidian Tasks Markdown style. Built for the long term: a web app today, native mobile next, and possibly calm e-ink devices later.

## Positioning

Open source (GPL-3.0) and self-hostable, with a hosted cloud at todone.today. Today the hosted cloud is free and syncs across devices. Paid cloud plans will come for heavy use and teams, with payments through Razorpay; they are not purchasable yet, so any price shown must say it opens soon. Self-hosting stays free forever. A lifetime licence, if offered, never includes unlimited hosted cloud.

## Roadmap

1. **Web app (now):** everything under Capabilities.
2. **Native mobile (next):** Android and iOS apps with mobile-first capture, push reminders, cross-device sync, OS integrations, widgets and quick actions. Publishing needs a Google Play Console account ($25 one-time) and the Apple Developer Program ($99 a year): a $124 community funding target, which covers the accounts only, not development. Contributions come from members' plan purchases through Razorpay/UPI (not live yet). The site shows real progress only (starts at $0, updated by hand in `apps/web/src/lib/landing.ts`), and the section is removed once the target is reached.
3. **Hardware (exploratory, no commitment):** e-ink devices that show the day's tasks without a phone: a pocket e-reader for today's tasks with check-off, a household display for fridge, desk or wall with family lists and schedules, desk displays, e-ink calendars. An early e-paper firmware prototype exists for an ESP32-S3 e-paper board; nothing is for sale.

## Operating Context

- Web: browser on desktop and phone, installable, works offline.
- Integrations live on the server side because OAuth needs a server.

## Capabilities and Constraints

- Shipped (web): accounts, teams and invitations, lists and sticky notes with drag and drop, steps (subtasks), stickers, repeats, calendar views and sharing, Brainstorm, Import with AI, onboarding tour, a no-account demo at /demo, integrations, push reminders, offline, export, account deletion, feedback, guide, changelog, status page.
- Undecided: final product name. Cloud plan limits and extras on the site (10 lists and a team of 5 free; Plus and Team extras) are provisional, labelled as such, and not enforced in code yet; see contributing-docs/pricing.md.

## Brand Commitments

- Working name "todone"; a final name comes later, so keep the name easy to swap (one place).
- Tagline: "Todos. Done right." (replaced "Lists that actually get done." on 2026-11-05).
- Visual references the user chose: https://zagged.com/ and https://two7square.com/about
- Modern, minimal, premium; playful but not childish; product-first with real UI; no generic SaaS template.

## Evidence on Hand

- No customers, testimonials, user counts, press or funding progress exist. Do not invent them.
- Real UI to show: the app itself (demo at /demo) and screenshots the user will supply via image URLs.

## Product Principles

1. Direct manipulation: drag, drop and click before forms and menus.
2. Your data stays yours: open source, self-hostable, Markdown-compatible.
3. Fair cloud: free covers normal use; paying is for unusually heavy use and teams.
4. Calm and fast over feature-heavy; simple even as it grows into an ecosystem.
