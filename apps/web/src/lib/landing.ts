// Everything on the landing page that changes without a redesign: image URLs, the mobile funding target and
// progress, the plans and where payments go. Edit values here; the layout follows.

// An image slot: set `src` to any URL (or a file in /public) and the slot shows it; leave it null and it shows a
// labelled placeholder of the same shape. `concept` marks pictures of things that don't exist yet.
export type Shot = { src: string | null; alt: string; label: string; ratio: string; concept?: boolean };

export const SHOTS = {
  board: {
    src: "/landing/board.jpg",
    alt: "todone's board: a list of sticky notes with steps, dates and stickers for when, how long and priority",
    label: "The board on desktop",
    ratio: "1440 / 682",
  },
  calendar: {
    src: null,
    alt: "todone's week calendar with tasks placed on times and a To plan tray",
    label: "Screenshot: the week calendar",
    ratio: "16 / 10",
  },
  mobile: {
    src: "/landing/concept-mobile.webp",
    alt: "Concept: todone's mobile app, a Today screen with three tasks and a task's details with its steps",
    label: "Concept: todone on a phone",
    ratio: "586 / 540",
    concept: true,
  },
  pocket: {
    src: "/landing/concept-pocket.webp",
    alt: "Concept: a small e-ink reader on a stand showing today's tasks, one ticked off",
    label: "Concept render: pocket e-reader",
    ratio: "612 / 476",
    concept: true,
  },
  household: {
    src: "/landing/concept-household.webp",
    alt: "Concept: an e-ink display on a fridge door showing the family's tasks",
    label: "Concept render: household display",
    ratio: "924 / 476",
    concept: true,
  },
} satisfies Record<string, Shot>;

// Mobile publishing accounts: Google Play Console ($25 once) and the Apple Developer Program ($99 a year).
// `raisedUsd` is what members' purchases have actually raised; update it from Razorpay. Once it reaches the
// target, set `done` and the section steps aside.
export const FUNDING = {
  targetUsd: 124,
  raisedUsd: 0,
  done: false,
  parts: [
    ["Google Play Console", "$25 once"],
    ["Apple Developer Program", "$99 a year"],
  ],
} as const;

// Razorpay payment page (UPI, cards, netbanking). Empty until it's live; buttons then say "Opening soon".
export const PAY_URL = "";

export type Plan = {
  name: string;
  inr: string;
  usd: string;
  per: string;
  note: string;
  points: string[];
  fill: string;
  lead?: boolean;
};

// Hosted cloud plans. Free covers everyday use; paying is for heavy use and teams. Self-hosting is always free.
export const PLANS: Plan[] = [
  {
    name: "Free",
    inr: "₹0",
    usd: "$0",
    per: "forever",
    fill: "#fff8ef",
    note: "Everything todone does, synced across your devices.",
    points: [
      "Up to 10 lists",
      "One team of up to 5 people",
      "Calendar, Brainstorm, integrations",
      "Offline, export any time",
    ],
  },
  {
    name: "Plus",
    inr: "₹899",
    usd: "$29",
    per: "a year",
    fill: "var(--lime)",
    note: "Or ₹99 / $3 a month, ₹499 / $16 for six months.",
    points: [
      "Unlimited lists",
      "Teams of up to 10 people",
      "Restorable daily backups (planned)",
      "Early access to the mobile apps (planned)",
    ],
    lead: true,
  },
  {
    name: "Team",
    inr: "₹1,499",
    usd: "$49",
    per: "a person, a year",
    fill: "var(--cyan)",
    note: "Or ₹149 / $5 a person a month, ₹799 / $26 for six months.",
    points: [
      "Everything in Plus",
      "Unlimited people and teams",
      "Roles and admin controls (planned)",
      "Priority help (planned)",
    ],
  },
];

// A one-off way to back the mobile apps: three years of Plus, paid once. Not lifetime cloud, which would
// promise hosting costs forever.
export const FOUNDING = { name: "Founding member", inr: "₹1,999", usd: "$59", per: "once, for 3 years of Plus" };
