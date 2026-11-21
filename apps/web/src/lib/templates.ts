// Starting points for goals and rewards: pick one, then change anything before it's saved. Goals are grouped by
// the areas of a life (a "wheel of life", split finer so each group stays short); rewards by the kind of treat.
// Templates are plain data in the same shape the app saves (sdk goals.ts), minus ids and dates.
import type { Goal, GoalKind } from "@todone/sdk/goals";

export type GoalTemplate = Pick<Goal, "title" | "kind" | "perWeek" | "unit" | "start" | "target"> & { area: string };
export type RewardTemplate = { title: string; area: string; size: number }; // size: about how many tasks it's worth

export const GOAL_AREAS = [
  "Health & fitness",
  "Food",
  "Sleep & rest",
  "Mind & mood",
  "Learning",
  "Reading & writing",
  "Career & work",
  "Money",
  "Home",
  "Family & love",
  "Friends",
  "Creativity",
  "Hobbies & fun",
  "Screen time",
  "Travel & adventure",
  "Giving back",
  "Reflection & faith",
] as const;
export type GoalArea = (typeof GOAL_AREAS)[number];

const habit = (area: GoalArea, title: string, perWeek: number): GoalTemplate => ({ area, title, kind: "habit", perWeek });
const daily = (area: GoalArea, title: string, target: number, unit: string): GoalTemplate => ({ area, title, kind: "daily", target, unit });
const reach = (area: GoalArea, title: string, start: number, target: number, unit: string): GoalTemplate => ({
  area,
  title,
  kind: "target",
  start,
  target,
  unit,
});
const outcome = (area: GoalArea, title: string): GoalTemplate => ({ area, title, kind: "outcome" });

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // Health & fitness
  habit("Health & fitness", "Work out", 3),
  habit("Health & fitness", "Go for a walk", 5),
  daily("Health & fitness", "Walk 8,000 steps a day", 8000, "steps"),
  habit("Health & fitness", "Stretch or do yoga", 4),
  reach("Health & fitness", "Run 5 km without stopping", 1, 5, "km"),
  outcome("Health & fitness", "Run my first 10K"),
  reach("Health & fitness", "Reach my healthy weight", 80, 72, "kg"),
  reach("Health & fitness", "Do 20 push-ups in a row", 5, 20, "push-ups"),
  outcome("Health & fitness", "Book a full health check-up"),
  habit("Health & fitness", "Take the stairs", 5),
  // Food
  daily("Food", "Drink 8 glasses of water", 8, "glasses"),
  daily("Food", "Eat 5 portions of fruit and veg", 5, "portions"),
  daily("Food", "Eat 100 g of protein", 100, "g"),
  habit("Food", "Cook dinner at home", 5),
  habit("Food", "No sugary drinks today", 6),
  habit("Food", "Bring lunch from home", 4),
  outcome("Food", "Learn 10 healthy recipes"),
  habit("Food", "No snacks after 9 pm", 5),
  // Sleep & rest
  habit("Sleep & rest", "In bed by 11 pm", 5),
  daily("Sleep & rest", "Sleep 8 hours", 8, "hours"),
  habit("Sleep & rest", "No phone in bed", 6),
  habit("Sleep & rest", "Wake up at the same time", 6),
  habit("Sleep & rest", "Take a real day off", 1),
  habit("Sleep & rest", "Wind down without screens for 30 minutes", 5),
  // Mind & mood
  habit("Mind & mood", "Meditate for 10 minutes", 5),
  habit("Mind & mood", "Write three good things from today", 5),
  daily("Mind & mood", "Spend 20 minutes outside", 20, "min"),
  habit("Mind & mood", "Breathe slowly before a hard task", 5),
  outcome("Mind & mood", "Start talking to a therapist"),
  habit("Mind & mood", "Journal how I feel", 3),
  habit("Mind & mood", "Do one thing just for me", 3),
  // Learning
  habit("Learning", "Practise a new language", 5),
  daily("Learning", "Learn 10 new words a day", 10, "words"),
  outcome("Learning", "Finish an online course"),
  outcome("Learning", "Get a certification"),
  habit("Learning", "Learn to code for 30 minutes", 4),
  outcome("Learning", "Learn to drive"),
  outcome("Learning", "Learn to swim"),
  habit("Learning", "Watch a talk or lecture", 2),
  // Reading & writing
  habit("Reading & writing", "Read most days", 5),
  reach("Reading & writing", "Read 12 books this year", 0, 12, "books"),
  daily("Reading & writing", "Read 20 pages a day", 20, "pages"),
  habit("Reading & writing", "Write 500 words", 3),
  outcome("Reading & writing", "Start a blog"),
  outcome("Reading & writing", "Write a short story"),
  habit("Reading & writing", "Read before sleeping instead of scrolling", 5),
  // Career & work
  outcome("Career & work", "Get a promotion"),
  outcome("Career & work", "Find a new job"),
  outcome("Career & work", "Update my CV and LinkedIn"),
  habit("Career & work", "Start the day with the hardest task", 5),
  habit("Career & work", "Two hours of deep work", 4),
  outcome("Career & work", "Ship my side project"),
  outcome("Career & work", "Launch my business"),
  reach("Career & work", "Grow my client list", 0, 10, "clients"),
  habit("Career & work", "Clear my inbox", 5),
  // Money
  reach("Money", "Save ₹50,000", 0, 50000, "₹"),
  outcome("Money", "Build a 6-month emergency fund"),
  outcome("Money", "Pay off my credit card"),
  outcome("Money", "Make a monthly budget"),
  habit("Money", "Track what I spend", 6),
  outcome("Money", "Start investing every month"),
  habit("Money", "No eating out, cook instead", 4),
  outcome("Money", "Cancel subscriptions I don't use"),
  outcome("Money", "File my taxes early"),
  // Home
  habit("Home", "Tidy for 10 minutes", 5),
  outcome("Home", "Declutter my wardrobe"),
  habit("Home", "Make my bed", 6),
  outcome("Home", "Deep-clean the kitchen"),
  outcome("Home", "Fix the things that are broken"),
  habit("Home", "Water the plants", 3),
  outcome("Home", "Set up a work corner"),
  habit("Home", "Do the dishes before bed", 6),
  // Family & love
  habit("Family & love", "Call my parents", 2),
  habit("Family & love", "Date night", 1),
  habit("Family & love", "Family dinner without phones", 3),
  habit("Family & love", "Play with the kids for 30 minutes", 5),
  outcome("Family & love", "Plan a family trip"),
  outcome("Family & love", "Remember every birthday this year"),
  habit("Family & love", "Say thank you to someone at home", 5),
  // Friends
  habit("Friends", "Message a friend I miss", 2),
  habit("Friends", "Meet a friend in person", 1),
  outcome("Friends", "Host a dinner"),
  outcome("Friends", "Join a club or group"),
  outcome("Friends", "Make a new friend"),
  habit("Friends", "Reply to messages the same day", 5),
  // Creativity
  habit("Creativity", "Draw or sketch", 3),
  habit("Creativity", "Practise an instrument", 4),
  outcome("Creativity", "Learn a song all the way through"),
  habit("Creativity", "Take a photo worth keeping", 5),
  outcome("Creativity", "Make a short video"),
  outcome("Creativity", "Finish a craft project"),
  habit("Creativity", "Write a poem", 1),
  // Hobbies & fun
  habit("Hobbies & fun", "Play a sport", 2),
  outcome("Hobbies & fun", "Try a new hobby"),
  habit("Hobbies & fun", "Time in nature", 1),
  outcome("Hobbies & fun", "Grow something from seed"),
  habit("Hobbies & fun", "Play a board game", 1),
  outcome("Hobbies & fun", "Solve a 1,000-piece jigsaw"),
  // Screen time
  daily("Screen time", "Under 2 hours of social media", 2, "hours"),
  habit("Screen time", "No phone for the first hour", 5),
  habit("Screen time", "A screen-free evening", 2),
  outcome("Screen time", "Turn off the notifications I don't need"),
  habit("Screen time", "Phone in another room while I work", 4),
  outcome("Screen time", "Delete one app that eats my time"),
  // Travel & adventure
  outcome("Travel & adventure", "Visit a new country"),
  outcome("Travel & adventure", "Plan a weekend trip"),
  outcome("Travel & adventure", "Go on a trek"),
  outcome("Travel & adventure", "See the mountains or the sea"),
  reach("Travel & adventure", "Visit new cities", 0, 5, "cities"),
  outcome("Travel & adventure", "Renew my passport"),
  outcome("Travel & adventure", "Travel somewhere alone"),
  // Giving back
  habit("Giving back", "Volunteer", 1),
  outcome("Giving back", "Donate blood"),
  reach("Giving back", "Give to causes I care about", 0, 10000, "₹"),
  habit("Giving back", "A small kindness for a stranger", 3),
  outcome("Giving back", "Teach someone a skill"),
  outcome("Giving back", "Give away what I don't use"),
  // Reflection & faith
  habit("Reflection & faith", "Pray or reflect", 6),
  habit("Reflection & faith", "Plan my week on Sunday", 1),
  habit("Reflection & faith", "Review my day before bed", 5),
  outcome("Reflection & faith", "Write my values down"),
  outcome("Reflection & faith", "Write a letter to my future self"),
  habit("Reflection & faith", "A quiet hour without plans", 1),
];

export const REWARD_AREAS = ["Little treats", "Food & drink", "Screen time", "Rest", "Going out", "Things to buy", "Experiences", "Big ones"] as const;
export type RewardArea = (typeof REWARD_AREAS)[number];
const r = (area: RewardArea, title: string, size: number): RewardTemplate => ({ area, title, size });

export const REWARD_TEMPLATES: RewardTemplate[] = [
  // Little treats
  r("Little treats", "A fancy coffee", 4),
  r("Little treats", "A favourite snack", 3),
  r("Little treats", "Ten minutes of doing nothing", 2),
  r("Little treats", "A new playlist, played loud", 2),
  r("Little treats", "A bubble bath", 5),
  r("Little treats", "Flowers for my desk", 6),
  r("Little treats", "A face mask", 4),
  r("Little treats", "Ice cream", 4),
  // Food & drink
  r("Food & drink", "Dessert after dinner", 4),
  r("Food & drink", "Cheat meal", 10),
  r("Food & drink", "Order my favourite takeaway", 12),
  r("Food & drink", "Pizza night", 10),
  r("Food & drink", "Brunch out", 15),
  r("Food & drink", "Bubble tea", 5),
  r("Food & drink", "A cake from the good bakery", 8),
  r("Food & drink", "Dinner at a new restaurant", 25),
  // Screen time
  r("Screen time", "20 min of Instagram", 3),
  r("Screen time", "An hour of gaming", 6),
  r("Screen time", "An episode of my show", 5),
  r("Screen time", "Movie night", 10),
  r("Screen time", "A binge-watch evening", 15),
  r("Screen time", "Buy a new game", 40),
  r("Screen time", "YouTube with no guilt for 30 minutes", 4),
  // Rest
  r("Rest", "A lazy morning", 8),
  r("Rest", "A nap", 5),
  r("Rest", "Sleep in on the weekend", 10),
  r("Rest", "An afternoon off", 20),
  r("Rest", "A massage", 30),
  r("Rest", "A spa day", 60),
  r("Rest", "A whole day with no plans", 35),
  // Going out
  r("Going out", "Coffee out", 5),
  r("Going out", "A walk somewhere pretty", 4),
  r("Going out", "Cinema trip", 15),
  r("Going out", "A drink with friends", 12),
  r("Going out", "A concert", 50),
  r("Going out", "A comedy show", 35),
  r("Going out", "A day at the museum", 20),
  // Things to buy
  r("Things to buy", "A new book", 30),
  r("Things to buy", "A notebook I love", 12),
  r("Things to buy", "New headphones", 80),
  r("Things to buy", "New running shoes", 70),
  r("Things to buy", "A plant", 15),
  r("Things to buy", "Something for my hobby", 40),
  r("Things to buy", "New clothes", 50),
  r("Things to buy", "A gadget on my wishlist", 100),
  // Experiences
  r("Experiences", "A cooking class", 45),
  r("Experiences", "Go-karting", 40),
  r("Experiences", "An escape room", 35),
  r("Experiences", "A day trip", 50),
  r("Experiences", "Theme park day", 70),
  r("Experiences", "A pottery workshop", 45),
  r("Experiences", "Stargazing night", 25),
  // Big ones
  r("Big ones", "A weekend away", 100),
  r("Big ones", "A holiday", 250),
  r("Big ones", "A new phone", 300),
  r("Big ones", "Concert tickets for my favourite band", 120),
  r("Big ones", "A course I've wanted to take", 150),
  r("Big ones", "A new bike", 200),
];

// A template as the goal dialog's starting point: just the goal's own fields (no area).
export const asGoal = (t: GoalTemplate): Partial<Goal> =>
  Object.fromEntries(Object.entries(t).filter(([k, v]) => k !== "area" && v !== undefined));

// How a goal template measures itself, said the way the goal cards say it.
const KIND_NOTE: Record<GoalKind, string> = { habit: "A habit", daily: "A daily amount", target: "A number to reach", outcome: "Milestones, by a date" };
export function goalNote(t: GoalTemplate) {
  if (t.kind === "habit") return `${KIND_NOTE.habit} · ${t.perWeek}× a week`;
  if (t.kind === "daily") return `${KIND_NOTE.daily} · ${t.target!.toLocaleString("en-IN")} ${t.unit}`;
  if (t.kind === "target") return `${KIND_NOTE.target} · ${t.target!.toLocaleString("en-IN")} ${t.unit}`;
  return KIND_NOTE.outcome;
}

// Search: every word typed must appear in the title or the area, in any order, ignoring case.
export function matches(text: string, ...fields: string[]) {
  const hay = fields.join(" ").toLowerCase();
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}
