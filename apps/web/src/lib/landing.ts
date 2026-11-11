// Everything on the landing page that changes without a redesign: image URLs, the funding goals and progress, the
// plans and where payments go. Edit values here; the layout follows.

// An image slot: set `src` to any URL (or a file in /public) and the slot shows it; leave it null and it shows a
// labelled placeholder of the same shape. `concept` marks pictures of things that don't exist yet. `prompt` is the
// brief to generate the image from (any image model), so a replacement matches the page.
export type Shot = { src: string | null; alt: string; label: string; ratio: string; concept?: boolean; prompt?: string };

// Shared art direction for the product renders, so every shot reads as one campaign.
const LOOK =
  "Photoreal product photography, editorial and premium, natural daylight with soft shadows, shallow depth of field, " +
  "shot for a design-led brand aimed at young working professionals and Gen Z. The device is a matte off-black e-ink " +
  "display with a thin bezel and a small lime-green (#d4f04a) accent; its paper-white screen shows a todo list titled " +
  "'Today' with crisp black text, square checkboxes, one item ticked off, and a small checked-box logo with the word " +
  "'todone' in a tall condensed bold typeface. No other logos, no people's faces, no text besides the screen. ";

export const SHOTS = {
  board: {
    src: "/landing/board.jpg",
    alt: "todone's board: a list of sticky notes with steps, dates and stickers for when, how long and priority",
    label: "The board on desktop",
    ratio: "16 / 9",
  },
  // The same board on a phone (captured at 390 px wide), shown instead of the desktop shot on small screens.
  boardMobile: {
    src: "/landing/board-mobile.jpg",
    alt: "todone on a phone: the list's sticky notes with steps and stickers, one tidy row of controls on top",
    label: "The board on a phone",
    ratio: "390 / 700",
  },
  calendar: {
    src: null,
    alt: "todone's week calendar with tasks placed on times and a To plan tray",
    label: "Screenshot: the week calendar",
    ratio: "16 / 10",
  },
  mobile: {
    src: "/landing/mobile.webp",
    alt: "Concept: todone's mobile app on two phones, today's notes and quick capture",
    label: "Concept render: todone on a phone",
    ratio: "928 / 1152",
    concept: true,
    prompt:
      "Photoreal product photography of two modern smartphones, one upright and one leaning against it, on a cream " +
      "surface with a hard black shadow, flat lime-green (#d4f04a) backdrop. Screens show a todo app made of colourful " +
      "sticky notes (butter yellow, pink, cyan, lime) with thick black outlines and hard offset shadows; the front " +
      "phone shows 'Today' with three notes and one ticked, the back phone shows one note opened into steps. Bold, " +
      "playful, premium, Gen Z editorial styling. No other logos, no hands. Portrait 4:5.",
  },
  desk: {
    src: "/landing/desk.webp",
    alt: "Concept: a todone e-ink display on a desk next to a laptop and coffee, showing today's tasks",
    label: "Concept render: desk display",
    ratio: "1200 / 896",
    concept: true,
    prompt:
      LOOK +
      "Scene: a 7-inch todone display on a slim aluminium stand on a clean wooden desk, beside a laptop, a mechanical " +
      "keyboard with one lime keycap, a ceramic coffee cup and a small plant; warm morning window light. Landscape 4:3.",
  },
  fridge: {
    src: "/landing/fridge.webp",
    alt: "Concept: a todone e-ink display on a fridge door showing the household's shared list",
    label: "Concept render: fridge display",
    ratio: "1200 / 896",
    concept: true,
    prompt:
      LOOK +
      "Scene: a 10-inch todone display magnetically mounted on a matte sage-green fridge door in a bright modern flat " +
      "kitchen, with a couple of colourful magnets and a polaroid nearby; the screen shows a shared list titled " +
      "'Home' (groceries, bills, plants). Landscape 4:3.",
  },
  bag: {
    src: "/landing/bag.webp",
    alt: "Concept: a small todone e-ink display clipped to a backpack strap, showing the next three tasks",
    label: "Concept render: bag clip",
    ratio: "928 / 1152",
    concept: true,
    prompt:
      LOOK +
      "Scene: a palm-sized todone display in a rugged rounded case with a carabiner clip, hanging from the strap of a " +
      "black technical backpack, on a city street at golden hour with a blurred metro station behind; the screen " +
      "shows 'Next' with three tasks. Streetwear, Gen Z editorial mood. Portrait 4:5.",
  },
} satisfies Record<string, Shot>;

// The kickstarter: each goal unlocks the next step, funded by members' Plus, Team and Founding purchases.
// App-store fees are what Google and Apple charge (converted at about ₹88 to $1). Hardware goals are three prototype
// units' worth of parts each (Indian retail prices, Nov 2026), for trial and error; not manufacturing.
// `raisedInr` is what members have actually raised; update it from Razorpay. Set `done` to hide the section.
export const FUNDING = {
  raisedInr: 0,
  done: false,
};

export type Goal = { key: string; name: string; inr: number; what: string; fill: string; kind: "fee" | "rnd" };

export const GOALS: Goal[] = [
  {
    key: "android",
    name: "Native Android app",
    inr: 2200,
    what: "Puts todone on the Play Store.",
    fill: "var(--lime)",
    kind: "fee",
  },
  {
    key: "iphone",
    name: "Native iPhone app",
    inr: 8800,
    what: "Puts todone on the App Store.",
    fill: "var(--cyan)",
    kind: "fee",
  },
  {
    key: "desk",
    name: "Desk display",
    inr: 46500,
    what: "Parts for the first desk screens.",
    fill: "var(--butter)",
    kind: "rnd",
  },
  {
    key: "fridge",
    name: "Fridge display",
    inr: 22500,
    what: "Parts for the first fridge screens.",
    fill: "var(--pink)",
    kind: "rnd",
  },
  {
    key: "bag",
    name: "Bag clip",
    inr: 18900,
    what: "Parts for the first bag clips.",
    fill: "var(--peri)",
    kind: "rnd",
  },
];


export type Billing = "month" | "half" | "year";
export const BILLING: [Billing, string][] = [
  ["month", "Monthly"],
  ["half", "6 months"],
  ["year", "Yearly"],
];

export type Plan = {
  name: string;
  // Price per billing period, in rupees and dollars; null on Free.
  price: Record<Billing, [string, string]> | null;
  // Launch price for the first term of a longer plan; it renews at `price`. Shown with the renewal, always.
  intro?: Partial<Record<Billing, [string, string]>>;
  per: string;
  points: string[];
  fill: string;
  lead?: boolean;
};

// Hosted cloud plans. Free covers everyday use; paying is for heavy use and teams. Self-hosting is always free.
export const PLANS: Plan[] = [
  {
    name: "Free",
    price: null,
    per: "forever",
    fill: "#fff8ef",
    points: [
      "Up to 10 lists",
      "Personal use: no teams or sharing",
      "Calendar, Brainstorm, integrations",
      "Offline, export any time",
    ],
  },
  {
    name: "Plus",
    price: { month: ["₹99", "$3"], half: ["₹499", "$16"], year: ["₹899", "$29"] },
    intro: { half: ["₹349", "$11"], year: ["₹599", "$19"] },
    per: "",
    fill: "var(--lime)",
    points: [
      "Unlimited lists",
      "Share with up to 6 people",
      "Restorable daily backups",
      "Early access to the mobile apps",
    ],
    lead: true,
  },
  {
    name: "Team",
    price: { month: ["₹149", "$5"], half: ["₹799", "$26"], year: ["₹1,499", "$49"] },
    intro: { half: ["₹549", "$18"], year: ["₹999", "$33"] },
    per: "a person",
    fill: "var(--cyan)",
    points: [
      "Everything in Plus",
      "Unlimited people and teams",
      "Roles and admin controls",
      "Priority help",
    ],
  },
];

// What a new member pays for a year of Plus (the launch price), for the funding calculator.
export const PLUS_YEAR_INR = 599;

// A one-off way to back the roadmap: three years of Plus, paid once. Not lifetime cloud, which would promise
// hosting costs forever.
export const FOUNDING = { name: "Founding member", inr: "₹1,999", usd: "$59", yearly: "₹2,397" };
